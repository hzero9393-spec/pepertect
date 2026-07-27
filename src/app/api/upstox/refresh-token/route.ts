import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_USER_ID, UPSTOX_API_KEY, UPSTOX_API_SECRET } from '@/lib/upstox';
import { prisma } from '@/lib/db';
import { UPSTOX_WORKER_URL } from '@/lib/upstox';

/**
 * GET /api/upstox/refresh-token
 *
 * Proactively refreshes the Upstox access token before it expires.
 * Designed to be called:
 *   - By a cron job (Vercel Cron every ~20 min during market hours)
 *   - By the client when it detects 'token_invalid' status
 *
 * Flow:
 *   1. Find the stored token in DB
 *   2. If refresh_token exists and token is near expiry (< 30 min), refresh it
 *   3. Store new token in DB + push to CF Worker + update Vercel env
 *
 * This prevents the token from expiring and causing data gaps.
 */
export async function GET(req: NextRequest) {
  const logs: string[] = [];
  const addLog = (msg: string) => logs.push(msg);

  try {
    // Find the token — try admin user first, then any user
    let userId = ADMIN_USER_ID;

    if (!userId) {
      try {
        // Find first user with an active Upstox token
        const tokenRow = await prisma.upstoxToken.findFirst({
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' },
        });
        userId = tokenRow?.userId || null;
      } catch (e: any) {
        addLog(`DB lookup failed: ${e.message}`);
      }
    }

    if (!userId) {
      // No token in DB — check if env var exists, try to decode and refresh
      log('No stored token found');
      return NextResponse.json({ success: false, error: 'No stored token', logs });
    }

    // Get stored token
    const row = await prisma.upstoxToken.findUnique({ where: { userId } });
    if (!row) {
      addLog(`Token row not found for user: ${userId}`);
      return NextResponse.json({ success: false, error: 'Token not found', logs });
    }

    const now = Date.now();
    const expiresAt = new Date(row.expiresAt).getTime();
    const thirtyMinMs = 30 * 60 * 1000;

    // If token is fresh (more than 30 min to expiry), no refresh needed
    if (expiresAt - now > thirtyMinMs) {
      const remainingMin = Math.round((expiresAt - now) / 60000);
      addLog(`Token fresh, expires in ${remainingMin} min — no refresh needed`);
      return NextResponse.json({ success: true, refreshed: false, expiresAt: row.expiresAt, remainingMin, logs });
    }

    // Token is near expiry — refresh needed
    addLog(`Token near expiry (expires at ${row.expiresAt}), refreshing...`);

    if (!row.refreshToken) {
      log('No refresh_token available — cannot auto-refresh');
      // Mark token as inactive
      await prisma.upstoxToken.update({ where: { userId }, data: { isActive: false } });
      return NextResponse.json({ success: false, error: 'No refresh_token', logs });
    }

    // Call Upstox refresh endpoint
    const body = new URLSearchParams({
      refresh_token: row.refreshToken,
      client_id: UPSTOX_API_KEY,
      client_secret: UPSTOX_API_SECRET,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://api.upstox.com/v2/login/authorization/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      addLog(`Refresh failed: ${res.status} ${text}`);
      // Mark as inactive
      await prisma.upstoxToken.update({ where: { userId }, data: { isActive: false } });
      return NextResponse.json({ success: false, error: `Refresh failed: ${res.status}`, detail: text, logs });
    }

    const tokenRes = await res.json();
    if (!tokenRes.access_token) {
      log('Refresh returned no access_token');
      return NextResponse.json({ success: false, error: 'No access_token in response', logs });
    }

    const newExpiresAt = new Date(Date.now() + (tokenRes.expires_in || 86400) * 1000);

    // Store new token in DB
    await prisma.upstoxToken.update({
      where: { userId },
      data: {
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token || row.refreshToken,
        expiresAt: newExpiresAt,
        isActive: true,
      },
    });
    addLog(`Token refreshed and stored. New expiry: ${newExpiresAt.toISOString()}`);

    // Push to CF Worker
    try {
      const workerRes = await fetch(`${UPSTOX_WORKER_URL}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRes.access_token }),
      });
      addLog(`Worker push: ${workerRes.ok ? 'success' : `failed ${workerRes.status}`}`);
    } catch (e: any) {
      addLog(`Worker push failed: ${e.message}`);
    }

    // Update Vercel env var
    try {
      const vercelToken = process.env.VERCEL_TOKEN;
      const vercelProjectId = process.env.VERCEL_PROJECT_ID;
      if (vercelToken && vercelProjectId) {
        const listRes = await fetch(`https://api.vercel.com/v9/projects/${vercelProjectId}/env`, {
          headers: { Authorization: `Bearer ${vercelToken}` },
        });
        if (listRes.ok) {
          const envs = (await listRes.json()).envs || [];
          const existing = envs.find((e: any) => e.key === 'UPSTOX_ACCESS_TOKEN');
          if (existing) {
            await fetch(`https://api.vercel.com/v9/projects/${vercelProjectId}/env/${existing.id}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                value: tokenRes.access_token,
                target: existing.target,
                type: 'encrypted',
              }),
            });
            log('Vercel env var updated');
          }
        }
      }
    } catch (e: any) {
      addLog(`Vercel env update failed (non-critical): ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      refreshed: true,
      newExpiresAt: newExpiresAt.toISOString(),
      expiresIn: tokenRes.expires_in,
      logs,
    });
  } catch (e: any) {
    addLog(`Exception: ${e.message}`);
    return NextResponse.json({ success: false, error: e.message, logs });
  }
}
