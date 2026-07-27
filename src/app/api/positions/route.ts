import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

const MOCK_LTP: Record<string, number> = {
  RELIANCE: 1882.75, TCS: 3945.60, INFY: 1568.30, HDFCBANK: 1685.20,
  ICICIBANK: 1245.80, SBIN: 828.45, BHARTIARTL: 1620.50, ITC: 468.25,
  HINDUNILVR: 2534.10, KOTAKBANK: 1789.30, LT: 3542.65, AXISBANK: 1168.40,
  BAJFINANCE: 7234.50, MARUTI: 12450.80, TATAMOTORS: 978.35, WIPRO: 572.60,
  HCLTECH: 1712.40, SUNPHARMA: 1824.15, TITAN: 3568.90, ADANIENT: 2890.45,
  NIFTY: 24318.20, SENSEX: 80109.85, BANKNIFTY: 52402.10, FINNIFTY: 23518.45,
};

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
        const exitPrice = MOCK_LTP[p.symbol] ?? Number(p.currentPrice);
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
      const currentPrice = MOCK_LTP[p.symbol] ?? Number(p.currentPrice);
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
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Fetch positions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch positions' }, { status: 500 });
  }
}
