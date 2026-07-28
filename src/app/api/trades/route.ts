import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Check for yesterday filter
    const url = new URL(req.url);
    const yesterdayOnly = url.searchParams.get('yesterday') === 'true';
    
    let whereClause: Record<string, unknown> = { userId: auth.userId };
    
    if (yesterdayOnly) {
      // Get trades from yesterday (00:00:00 to 23:59:59)
      const now = new Date();
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      
      whereClause = {
        userId: auth.userId,
        createdAt: {
          gte: yesterdayStart,
          lte: yesterdayEnd,
        },
      };
    }

    const trades = await db.trade.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const mapped = trades.map((t) => ({
      ...t,
      price: Number(t.price),
      pnl: Number(t.pnl),
      brokerage: Number(t.brokerage),
      strikePrice: t.strikePrice ? Number(t.strikePrice) : null,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Fetch trades error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch trades' }, { status: 500 });
  }
}
