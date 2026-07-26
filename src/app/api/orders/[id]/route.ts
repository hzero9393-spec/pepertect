import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const order = await db.order.findFirst({ where: { id, userId: auth.userId } });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'Cannot cancel filled order' }, { status: 400 });
    }

    const updated = await db.order.update({
      where: { id },
      data: { status: 'CANCELLED', reason: 'User cancelled' },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel order' }, { status: 500 });
  }
}
