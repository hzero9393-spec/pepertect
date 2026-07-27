import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const trades = await db.trade.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
