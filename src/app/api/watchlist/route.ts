import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { FREE_WATCHLIST_LIMIT } from '@/lib/tier';

const MOCK_PRICES: Record<string, number> = {
  RELIANCE: 1882.75, TCS: 3945.60, INFY: 1568.30, HDFCBANK: 1685.20,
  ICICIBANK: 1245.80, SBIN: 828.45, BHARTIARTL: 1620.50, ITC: 468.25,
  HINDUNILVR: 2534.10, KOTAKBANK: 1789.30, LT: 3542.65, AXISBANK: 1168.40,
  BAJFINANCE: 7234.50, MARUTI: 12450.80, TATAMOTORS: 978.35, WIPRO: 572.60,
  HCLTECH: 1712.40, SUNPHARMA: 1824.15, TITAN: 3568.90, ADANIENT: 2890.45,
};

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const watchlist = await db.watchlist.findMany({
      where: { userId: auth.userId },
      include: { stock: true },
      orderBy: { createdAt: 'desc' },
    });

    const items = watchlist.map((w) => {
      const ltp = MOCK_PRICES[w.stock.symbol] ?? 0;
      const close = Number(w.stock.close ?? 0);
      const change = ltp - close;
      const changePct = close > 0 ? (change / close) * 100 : 0;
      return {
        id: w.id,
        stockId: w.stockId,
        symbol: w.stock.symbol,
        name: w.stock.name,
        ltp,
        change: parseFloat(change.toFixed(2)),
        changePct: parseFloat(changePct.toFixed(2)),
        segment: w.stock.segment,
        addedAt: w.createdAt,
      };
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Fetch watchlist error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Symbol required' }, { status: 400 });
    }

    // Check limit for free users
    if (auth.tier === 'FREE') {
      const count = await db.watchlist.count({ where: { userId: auth.userId } });
      if (count >= FREE_WATCHLIST_LIMIT) {
        return NextResponse.json({ success: false, error: `Free plan limited to ${FREE_WATCHLIST_LIMIT} watchlist items` }, { status: 403 });
      }
    }

    let stock = await db.stock.findUnique({ where: { symbol } });
    if (!stock) {
      stock = await db.stock.create({
        data: { symbol, name: symbol, lotSize: 1, tickSize: 0.05 },
      });
    }

    const existing = await db.watchlist.findUnique({
      where: { userId_stockId: { userId: auth.userId, stockId: stock.id } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Already in watchlist' }, { status: 409 });
    }

    const watchlistItem = await db.watchlist.create({
      data: { userId: auth.userId, stockId: stock.id },
    });

    return NextResponse.json({ success: true, data: watchlistItem });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add to watchlist' }, { status: 500 });
  }
}
