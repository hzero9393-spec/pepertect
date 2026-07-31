import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

/* NOTE: We intentionally do NOT use a MOCK_LTP table anymore.
 * The hard-coded prices were stale (e.g. RELIANCE was 1882.75 while the
 * real market price was ~1278), which caused the position page to show
 * absurd P&L like +₹1,207 the moment a trade was placed.
 *
 * Instead, we set `currentPrice = avgPrice` for every newly-fetched
 * position. This means `pnl` returned by this route is always 0 until
 * the client's WebSocket delivers the actual live LTP. The client-side
 * PositionsPage then computes the real P&L from the live tick — giving
 * users accurate real-time P&L that matches the per-position card. */

/* 24-hour retention cutoff — positions older than this are auto-cleaned */
const POSITION_RETENTION_MS = 24 * 60 * 60 * 1000;

/* Throttle the 24h cleanup to run at most once every 5 minutes.
 * This avoids running the stale-position cleanup query on EVERY
 * positions GET request (which fires every 15s from the client). */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = 0;

async function runStaleCleanup(userId: string) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = new Date(now - POSITION_RETENTION_MS);

  /* ---------- 24h retention: auto-clean old OPEN positions ----------
     Square off any OPEN position opened >24h ago (treat as auto-squareoff).
     Releases margin back to portfolio. */
  const stale = await db.position.findMany({
    where: { userId, status: 'OPEN', openedAt: { lt: cutoff } },
  });
  if (stale.length > 0) {
    await Promise.all(stale.map(async (p) => {
      const exitPrice = Number(p.currentPrice) > 0
        ? Number(p.currentPrice)
        : Number(p.avgPrice);
      const pnl = (exitPrice - Number(p.avgPrice)) * p.quantity * (p.side === 'LONG' ? 1 : -1);
      const orderValue = exitPrice * p.quantity;
      await db.position.update({
        where: { id: p.id },
        data: {
          status: 'SQUAREDOFF',
          exitPrice,
          exitReason: 'AUTO_EXPIRED_24H',
          closedAt: new Date(),
          pnl,
        },
      });
      await db.portfolio.update({
        where: { userId },
        data: {
          totalBalance: { increment: orderValue },
          availableMargin: { increment: orderValue },
          investedAmount: { decrement: Number(p.investedAmt) },
          totalPnl: { increment: pnl },
          realizedPnl: { increment: pnl },
        },
      });
    }));
  }

  /* Also delete CLOSED/SQUAREDOFF positions older than 24h to keep the table clean */
  await db.position.deleteMany({
    where: {
      userId,
      status: { in: ['SQUAREDOFF', 'CLOSED'] },
      closedAt: { lt: cutoff },
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Run stale cleanup (throttled internally to once per 5 minutes)
    await runStaleCleanup(auth.userId);

    const positions = await db.position.findMany({
      where: { userId: auth.userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

    const enriched = positions.map((p) => {
      const currentPrice = Number(p.avgPrice);
      const pnl = (currentPrice - Number(p.avgPrice)) * p.quantity * (p.side === 'LONG' ? 1 : -1);
      const pnlPct = Number(p.avgPrice) > 0 ? ((currentPrice - Number(p.avgPrice)) / Number(p.avgPrice)) * 100 : 0;
      return {
        ...p,
        currentPrice,
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPct: parseFloat(pnlPct.toFixed(2)),
        avgPrice: Number(p.avgPrice),
        investedAmt: Number(p.investedAmt),
        strikePrice: p.strikePrice ? Number(p.strikePrice) : null,
        instrumentKey: p.instrumentKey ?? null,
        stopLoss: p.stopLoss ? Number(p.stopLoss) : null,
        target: p.target ? Number(p.target) : null,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Fetch positions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch positions' }, { status: 500 });
  }
}
