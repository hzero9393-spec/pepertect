import { NextRequest, NextResponse } from 'next/server';
import { getPlatformToken, ADMIN_USER_ID, UPSTOX_WORKER_URL } from '@/lib/upstox';
import { prisma } from '@/lib/db';

/**
 * GET /api/upstox/status
 * Returns the current Upstox connection status (token validity, worker state).
 */
export async function GET(req: NextRequest) {
  const token = await getPlatformToken(req);

  // Get stored token info
  let storedInfo: any = null;
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

  // Get worker stats
  let workerStats: any = null;
  try {
    const res = await fetch(`${UPSTOX_WORKER_URL}/stats`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) workerStats = await res.json();
  } catch (e) {
    workerStats = { error: 'Worker unreachable' };
  }

  return NextResponse.json({
    success: true,
    connected: !!token,
    hasEnvToken: !!process.env.UPSTOX_ACCESS_TOKEN,
    storedToken: storedInfo,
    worker: workerStats,
    adminMode: !!ADMIN_USER_ID,
  });
}
