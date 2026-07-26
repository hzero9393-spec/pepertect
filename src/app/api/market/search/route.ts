import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const q = req.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const stocks = await db.stock.findMany({
      where: {
        OR: [
          { symbol: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
    return NextResponse.json({ success: true, data: stocks });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 });
  }
}
