import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  const { symbol } = await params;

  try {
    const stock = await db.stock.findUnique({ where: { symbol } });
    if (!stock) {
      return NextResponse.json({ success: false, error: 'Stock not found' }, { status: 404 });
    }

    await db.watchlist.deleteMany({
      where: { userId: auth.userId, stockId: stock.id },
    });

    return NextResponse.json({ success: true, message: 'Removed from watchlist' });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove' }, { status: 500 });
  }
}
