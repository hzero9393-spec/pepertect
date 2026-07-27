import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, storeToken, pushTokenToWorker, ADMIN_USER_ID, UPSTOX_API_KEY, UPSTOX_REDIRECT_URI } from '@/lib/upstox';
import { prisma } from '@/lib/db';

/**
 * GET /callback?code=XXX&state=YYY
 *
 * Upstox OAuth redirect handler. Receives the authorization code, exchanges
 * it for an access token, stores it in the DB, and pushes it to the
 * Cloudflare Worker for hot reload.
 *
 * Robustness:
 * - Detects "Invalid Auth code" (UDAPI100057) — typically a stale/already-used code
 * - Detects DB failures and uses a fallback admin user id (UPSTOX_ADMIN_USER_ID env or first user)
 * - Logs full error to Vercel logs for debugging
 * - Returns the raw Upstox error JSON in the redirect URL so the user can see it
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('[/callback] OAuth redirect received:', {
    hasCode: !!code,
    codeLen: code?.length ?? 0,
    state,
    error,
    apiKey: UPSTOX_API_KEY ? `${UPSTOX_API_KEY.slice(0, 8)}...` : '(missing)',
    redirectUri: UPSTOX_REDIRECT_URI,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/upstox-status?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/upstox-status?error=missing_code', req.url)
    );
  }

  try {
    // Exchange code for token
    const tokenRes = await exchangeCodeForToken(code);

    console.log('[/callback] Token exchange succeeded:', {
      email: tokenRes.email,
      expiresIn: tokenRes.expires_in,
      hasRefresh: !!tokenRes.refresh_token,
      broker: tokenRes.broker,
    });

    // Determine user ID to associate the token with.
    // Priority:
    //   1. ADMIN_USER_ID env var (set via Vercel env UPSTOX_ADMIN_USER_ID)
    //   2. state param (passed from /api/upstox/connect — set to user id if logged in)
    //   3. Session cookie → user lookup
    //   4. First ADMIN user in DB
    //   5. First user in DB
    //   6. 'admin' fallback (so DB write doesn't fail on missing user)
    let userId = ADMIN_USER_ID || state;
    if (!userId || userId === 'anonymous') {
      try {
        const sessionToken = req.cookies.get('auth_token')?.value ||
                            req.cookies.get('session')?.value;
        if (sessionToken) {
          const session = await prisma.session.findUnique({
            where: { token: sessionToken },
            include: { user: true },
          });
          if (session && session.user) {
            userId = session.user.id;
          }
        }
      } catch (e: any) {
        console.warn('[/callback] Session lookup failed (continuing):', e?.message ?? e);
      }
    }

    if (!userId || userId === 'anonymous') {
      try {
        const adminUser = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          orderBy: { createdAt: 'asc' },
        });
        const anyUser = adminUser || await prisma.user.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        userId = anyUser?.id || null;
      } catch (e: any) {
        console.warn('[/callback] User lookup failed (DB unavailable?):', e?.message ?? e);
      }
    }

    // Final fallback — use 'admin' literal so token can still be stored
    // (DB schema allows arbitrary user id string; the relation is optional in practice)
    if (!userId || userId === 'anonymous') {
      userId = 'admin';
      console.warn('[/callback] No user found, using fallback userId="admin"');
    }

    // Store token (wrap in try/catch — DB may be unavailable)
    try {
      await storeToken(userId, tokenRes);
      console.log('[/callback] Token stored in DB for user:', userId);
    } catch (storeErr: any) {
      console.error('[/callback] storeToken failed (DB issue):', storeErr?.message ?? storeErr);
      // Don't abort — we still want to push to worker for hot reload
    }

    // Push token to Cloudflare Worker
    const pushed = await pushTokenToWorker(tokenRes.access_token);
    console.log('[/callback] Worker push result:', pushed);

    const params = new URLSearchParams({
      success: '1',
      email: tokenRes.email || '',
      expires_in: String(tokenRes.expires_in),
      worker: pushed ? 'updated' : 'failed',
      user_id: String(userId),
    });
    return NextResponse.redirect(
      new URL(`/upstox-status?${params.toString()}`, req.url)
    );
  } catch (e: any) {
    console.error('[/callback] Upstox OAuth failed:', {
      message: e?.message,
      stack: e?.stack?.split('\n').slice(0, 5).join(' | '),
    });

    // Extract the underlying Upstox error JSON if present.
    // The error message format from exchangeCodeForToken is:
    //   "Token exchange failed: 401 {json body}"
    // We want to surface the JSON to the user.
    let errorCode = '';
    let errorDetail = e?.message || 'unknown';
    try {
      const m = String(e?.message || '').match(/Token exchange failed: (\d+)\s*([\s\S]*)$/);
      if (m) {
        errorCode = m[1];
        try {
          const parsed = JSON.parse(m[2]);
          if (parsed?.errors?.[0]?.errorCode) {
            errorCode = parsed.errors[0].errorCode;
          }
          if (parsed?.errors?.[0]?.message) {
            errorDetail = parsed.errors[0].message;
          }
        } catch {
          errorDetail = m[2].slice(0, 200);
        }
      }
    } catch {}

    const params = new URLSearchParams({
      error: errorCode ? `${errorCode}: ${errorDetail}` : errorDetail,
      hint: errorCode === 'UDAPI100057'
        ? 'Auth code expired or already used. Close this tab, open a NEW tab, and visit /api/upstox/connect again. Do not refresh or use the back button.'
        : '',
    });
    return NextResponse.redirect(
      new URL(`/upstox-status?${params.toString()}`, req.url)
    );
  }
}
