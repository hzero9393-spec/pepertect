/**
 * Upstox OAuth + API helper.
 *
 * Flow:
 *   1. User clicks "Connect Upstox" → redirect to Upstox authorize URL
 *   2. Upstox redirects back to /callback?code=XXX
 *   3. /callback exchanges code for access_token
 *   4. Token stored in DB (UpstoxToken table) + pushed to Cloudflare Worker
 *   5. Worker reconnects with new token
 */

import { prisma } from './db';
import { authenticateRequest } from './api-auth';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export const UPSTOX_API_KEY = process.env.UPSTOX_API_KEY || 'ba78a999-08c9-4d1a-a628-89788c39147d';
export const UPSTOX_API_SECRET = process.env.UPSTOX_API_SECRET || '0piqhga06s';
export const UPSTOX_REDIRECT_URI =
  process.env.UPSTOX_REDIRECT_URI ||
  'https://pepertect.vercel.app/callback';

// Cloudflare Worker URL (for hot token refresh)
// Resolve from multiple env vars, and normalize wss:// → https:// just in case.
function resolveWorkerUrl(): string {
  const raw =
    process.env.UPSTOX_WORKER_URL ||
    process.env.NEXT_PUBLIC_UPSTOX_WS_URL ||
    'https://upstox-realtime.hzero9393.workers.dev';
  // Strip trailing /ws
  let url = raw.replace(/\/ws$/, '');
  // Convert wss:// → https:// (worker is HTTPS REST, not just WebSocket)
  if (url.startsWith('wss://')) url = 'https://' + url.slice(6);
  if (url.startsWith('ws://')) url = 'http://' + url.slice(5);
  return url;
}
export const UPSTOX_WORKER_URL = resolveWorkerUrl();

// Admin user ID — single Upstox account shared with all paper-trading users.
// Set this to your admin user's ID (or the first user's ID).
// For multi-user (each user connects own Upstox), use the authenticated user's ID.
export const ADMIN_USER_ID = process.env.UPSTOX_ADMIN_USER_ID || null;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface UpstoxTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  email?: string;
  user_id?: string;
  broker?: string;
}

export interface StoredToken {
  accessToken: string;
  expiresAt: Date;
  userEmail?: string | null;
  userIdUpstox?: string | null;
}

// ---------------------------------------------------------------------------
// OAuth URL builders
// ---------------------------------------------------------------------------
export function buildAuthorizeUrl(state?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: UPSTOX_API_KEY,
    redirect_uri: UPSTOX_REDIRECT_URI,
  });
  if (state) params.set('state', state);
  return `https://api.upstox.com/v2/login/authorization/dialog?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Exchange code for token
// ---------------------------------------------------------------------------
export async function exchangeCodeForToken(code: string): Promise<UpstoxTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: UPSTOX_API_KEY,
    client_secret: UPSTOX_API_SECRET,
    redirect_uri: UPSTOX_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://api.upstox.com/v2/login/authorization/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    // Surface a clear, typed error for the most common failure (already-used code)
    // so the callback handler can show a friendly hint.
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    const errCode = parsed?.errors?.[0]?.errorCode || '';
    const errMsg = parsed?.errors?.[0]?.message || '';
    if (errCode === 'UDAPI100057' || res.status === 401) {
      const e: any = new Error(`Token exchange failed: ${res.status} ${text}`);
      e.upstoxErrorCode = errCode;
      e.upstoxErrorMessage = errMsg;
      throw e;
    }
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as UpstoxTokenResponse;
}

// ---------------------------------------------------------------------------
// Get user ID from request (or admin override)
// ---------------------------------------------------------------------------
export async function getUserId(req: NextRequest): Promise<string | null> {
  if (ADMIN_USER_ID) return ADMIN_USER_ID;
  const auth = await authenticateRequest(req);
  if (auth && 'userId' in auth) return auth.userId;
  return null;
}

// ---------------------------------------------------------------------------
// Store token in DB
// ---------------------------------------------------------------------------
export async function storeToken(userId: string, token: UpstoxTokenResponse): Promise<void> {
  const expiresAt = new Date(Date.now() + (token.expires_in || 86400) * 1000);
  await prisma.upstoxToken.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || null,
      expiresAt,
      scope: token.scope || null,
      tokenType: token.token_type || 'Bearer',
      userEmail: token.email || null,
      userIdUpstox: token.user_id || null,
      broker: token.broker || 'UPSTOX',
      isActive: true,
    },
    update: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token || null,
      expiresAt,
      scope: token.scope || null,
      userEmail: token.email || null,
      userIdUpstox: token.user_id || null,
      broker: token.broker || 'UPSTOX',
      isActive: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Get stored token from DB
// ---------------------------------------------------------------------------
export async function getStoredToken(userId: string): Promise<StoredToken | null> {
  try {
    const row = await prisma.upstoxToken.findUnique({ where: { userId } });
    if (!row || !row.isActive) return null;
    return {
      accessToken: row.accessToken,
      expiresAt: row.expiresAt,
      userEmail: row.userEmail,
      userIdUpstox: row.userIdUpstox,
    };
  } catch (e: any) {
    // DB not available (e.g. local SQLite where Prisma is configured for PostgreSQL)
    // — return null so the caller falls back to env var or synthetic data.
    console.warn('[upstox] getStoredToken: DB lookup failed, returning null:', e?.message ?? e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Get active token (auto-refresh if expired)
// ---------------------------------------------------------------------------
export async function getActiveToken(userId: string): Promise<string | null> {
  const stored = await getStoredToken(userId);
  if (!stored) return null;
  // If token expires in next 5 min, consider it expired
  const now = new Date();
  const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
  if (stored.expiresAt < fiveMinLater) {
    // Token expired — need to re-authorize
    // Mark as inactive so the user is prompted to re-login
    try {
      await prisma.upstoxToken.update({
        where: { userId },
        data: { isActive: false },
      });
    } catch (e) {
      // DB not available — skip the update, just return null
    }
    return null;
  }
  return stored.accessToken;
}

// ---------------------------------------------------------------------------
// Push token to Cloudflare Worker (hot reload)
// ---------------------------------------------------------------------------
export async function pushTokenToWorker(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${UPSTOX_WORKER_URL}/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch (e) {
    console.error('[upstox] pushTokenToWorker failed:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Get the "active" token for the platform (admin token if set, else user's)
// ---------------------------------------------------------------------------
// Token priority:
//   1. DB-stored token (fresh — exchanged via OAuth flow at /callback)
//      ← This takes priority because it's freshly minted (24h validity).
//   2. Env var UPSTOX_ACCESS_TOKEN (manually set — may be stale/expired)
//      ← Used as fallback when no DB token is available yet (first-time setup).
//   3. Requesting user's DB-stored token
//   4. null (caller falls back to synthetic data)
export async function getPlatformToken(req?: NextRequest): Promise<string | null> {
  // Priority 1: admin user's stored DB token (if ADMIN_USER_ID is set)
  if (ADMIN_USER_ID) {
    const t = await getActiveToken(ADMIN_USER_ID);
    if (t) return t;
  }
  // Priority 2: requesting user's DB-stored token
  if (req) {
    const userId = await getUserId(req);
    if (userId) {
      const t = await getActiveToken(userId);
      if (t) return t;
    }
  }
  // Priority 3: env var (manually set token — used until OAuth flow is done)
  if (process.env.UPSTOX_ACCESS_TOKEN) {
    return process.env.UPSTOX_ACCESS_TOKEN;
  }
  return null;
}
