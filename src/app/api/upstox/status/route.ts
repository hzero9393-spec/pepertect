import { NextRequest, NextResponse } from 'next/server';
import { getPlatformToken, ADMIN_USER_ID, UPSTOX_WORKER_URL } from '@/lib/upstox';
import { workerProfile } from '@/lib/upstox-worker-proxy';
import { prisma } from '@/lib/db';

/**
 * GET /api/upstox/status
 * Returns the current Upstox connection status (token validity, worker state).
 *
 * Now also probes the worker's /profile endpoint to verify the live token
 * actually works (catches cases where the token is set but expired/revoked).
 */
export async function GET(req: NextRequest) {
  const token = await getPlatformToken(req);

  // Get stored token info
  let storedInfo: any = null;
  try {
    if (ADMIN_USER_ID) {
      const row = await prisma.upstoxToken.findUnique({ where: { userId: ADMIN_USER_ID } });
      if (row) {
        storedInfo = {
          email: row.userEmail,
          userIdUpstox: row.userIdUpstox,
          broker: row.broker,
          expiresAt: row.expiresAt,
          isActive: row.isActive,
          isExpired: row.expiresAt < new Date(),
        };
      }
    }
  } catch (e: any) {
    storedInfo = { error: 'DB lookup failed', message: e?.message };
  }

  // Get worker stats
  let workerStats: any = null;
  try {
    const res = await fetch(`${UPSTOX_WORKER_URL}/stats`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) workerStats = await res.json();
  } catch (e) {
    workerStats = { error: 'Worker unreachable' };
  }

  // Probe the live token via worker /profile endpoint
  let liveProbe: any = null;
  try {
    const r = await workerProfile();
    if (r.ok && r.data) {
      liveProbe = {
        status: 'ok',
        email: r.data.email,
        userName: r.data.user_name,
        userIdUpstox: r.data.user_id,
        broker: r.data.broker,
        isActive: r.data.is_active,
      };
    } else {
      liveProbe = { status: 'error', error: r.error || 'Profile probe failed' };
    }
  } catch (e: any) {
    liveProbe = { status: 'error', error: e?.message || 'Worker /profile exception' };
  }

  return NextResponse.json({
    success: true,
    connected: !!token,
    hasEnvToken: !!process.env.UPSTOX_ACCESS_TOKEN,
    storedToken: storedInfo,
    worker: workerStats,
    liveProbe,
    adminMode: !!ADMIN_USER_ID,
  });
}
