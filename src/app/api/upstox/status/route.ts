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
    const statsUrl = `${UPSTOX_WORKER_URL}/stats`;
    console.log('[upstox/status] fetching worker stats:', statsUrl);
    const res = await fetch(statsUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    console.log('[upstox/status] worker stats response:', res.status, res.statusText);
    if (res.ok) {
      workerStats = await res.json();
    } else {
      workerStats = { error: `Worker ${res.status}`, statusText: res.statusText };
    }
  } catch (e: any) {
    console.error('[upstox/status] worker stats fetch failed:', e?.message, e?.cause);
    workerStats = { error: 'Worker unreachable', detail: e?.message, cause: e?.cause?.code || e?.cause?.message };
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
