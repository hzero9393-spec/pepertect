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

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const cutoff = new Date(Date.now() - POSITION_RETENTION_MS);

    /* ---------- 24h retention: auto-clean old OPEN positions ----------
       Square off any OPEN position opened >24h ago (treat as auto-squareoff).
       Releases margin back to portfolio. */
    const stale = await db.position.findMany({
      where: { userId: auth.userId, status: 'OPEN', openedAt: { lt: cutoff } },
    });
    if (stale.length > 0) {
      await Promise.all(stale.map(async (p) => {
        // For ALL positions (EQUITY + OPTIONS + FUTURES), use stored
        // currentPrice if > 0, else fall back to avgPrice. We no longer
        // use any MOCK_LTP table — those values were stale and produced
        // wrong P&L on auto-squareoff. A 24h auto-squareoff therefore
        // produces ~0 P&L, which is the correct paper-trading behavior.
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
          where: { userId: auth.userId },
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
        userId: auth.userId,
        status: { in: ['SQUAREDOFF', 'CLOSED'] },
        closedAt: { lt: cutoff },
      },
    });

    const positions = await db.position.findMany({
      where: { userId: auth.userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

    const enriched = positions.map((p) => {
      // CRITICAL FIX: We no longer use any hard-coded MOCK_LTP table.
      // The API returns `currentPrice = avgPrice` so `pnl = 0` until the
      // client's WebSocket delivers the actual live LTP for the position's
      // instrument key. The PositionsPage computes the real-time P&L
      // client-side using the live tick — this guarantees the hero card
      // total matches the per-position card, and prevents absurd P&L
      // (e.g. +₹1,207 the moment a trade is placed) caused by stale
      // hard-coded prices.
      //
      // If the position has a stored currentPrice > 0 (e.g. set by a prior
      // 24h auto-squareoff attempt that updated the row), we still prefer
      // avgPrice here because the stored value may itself be stale — the
      // client will overwrite it with the live tick within ~800ms anyway.
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
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Fetch positions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch positions' }, { status: 500 });
  }
}
