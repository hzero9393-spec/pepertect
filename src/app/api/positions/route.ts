import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

const MOCK_LTP: Record<string, number> = {
  RELIANCE: 1882.75, TCS: 3945.60, INFY: 1568.30, HDFCBANK: 1685.20,
  ICICIBANK: 1245.80, SBIN: 828.45, BHARTIARTL: 1620.50, ITC: 468.25,
  HINDUNILVR: 2534.10, KOTAKBANK: 1789.30, LT: 3542.65, AXISBANK: 1168.40,
  BAJFINANCE: 7234.50, MARUTI: 12450.80, TATAMOTORS: 978.35, WIPRO: 572.60,
};

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const positions = await db.position.findMany({
      where: { userId: auth.userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

    const enriched = positions.map((p) => {
      const currentPrice = MOCK_LTP[p.symbol] ?? Number(p.currentPrice);
      const pnl = (currentPrice - Number(p.avgPrice)) * p.quantity;
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
