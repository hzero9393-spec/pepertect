import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const stocks = await db.stock.findMany({
      take: 50,
      orderBy: { symbol: 'asc' },
    });

    const enriched = stocks.map((s) => ({
      ...s,
      ltp: s.ltp ?? 0,
      change: s.change ?? 0,
      changePct: s.changePct ?? 0,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Fetch stocks error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stocks' }, { status: 500 });
  }
}

import { db } from '@/lib/db';
