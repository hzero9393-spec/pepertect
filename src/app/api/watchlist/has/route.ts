import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

// GET /api/watchlist/has?symbol=RELIANCE
// Returns { success, data: { inWatchlist: boolean } }
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get('symbol') || '').toUpperCase();

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol required' },
        { status: 400 }
      );
    }

    const stock = await db.stock.findUnique({ where: { symbol } });
    if (!stock) {
      return NextResponse.json({ success: true, data: { inWatchlist: false } });
    }

    const existing = await db.watchlist.findUnique({
      where: {
        userId_stockId: { userId: auth.userId, stockId: stock.id },
      },
    });

    return NextResponse.json({
      success: true,
      data: { inWatchlist: !!existing },
    });
  } catch (error) {
    console.error('Watchlist check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check watchlist' },
      { status: 500 }
    );
  }
}
