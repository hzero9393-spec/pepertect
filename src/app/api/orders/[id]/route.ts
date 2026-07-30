import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const order = await db.order.findFirst({ where: { id, userId: auth.userId } });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Cannot edit order with status ${order.status}` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { price: newPrice } = body;
    if (newPrice === undefined || newPrice === null || typeof newPrice !== 'number' || newPrice <= 0) {
      return NextResponse.json({ success: false, error: 'A valid price is required' }, { status: 400 });
    }

    const oldPrice = Number(order.price ?? 0);
    const quantity = order.quantity;
    const marginDiff = (newPrice - oldPrice) * quantity;

    // If margin needs to increase, check available margin
    if (marginDiff > 0) {
      const portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
      if (!portfolio) {
        return NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 });
      }
      if (Number(portfolio.availableMargin) < marginDiff) {
        return NextResponse.json(
          { success: false, error: 'Insufficient margin for price increase' },
          { status: 400 }
        );
      }
      await db.portfolio.update({
        where: { userId: auth.userId },
        data: { availableMargin: { decrement: marginDiff } },
      });
    } else if (marginDiff < 0) {
      // Release excess margin
      await db.portfolio.update({
        where: { userId: auth.userId },
        data: { availableMargin: { increment: Math.abs(marginDiff) } },
      });
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: { price: newPrice },
    });

    const mappedOrder = {
      ...updatedOrder,
      price: Number(updatedOrder.price ?? 0),
      triggerPrice: Number(updatedOrder.triggerPrice ?? 0),
      filledPrice: Number(updatedOrder.filledPrice ?? 0),
      strikePrice: Number(updatedOrder.strikePrice ?? 0),
    };
    return NextResponse.json({ success: true, data: mappedOrder });
  } catch (error) {
    console.error('Edit order error:', error);
    return NextResponse.json({ success: false, error: 'Failed to edit order' }, { status: 500 });
  }
}
