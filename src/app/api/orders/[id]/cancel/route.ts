import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { notifyTradeExecuted } from '@/lib/notifications';

export async function POST(
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
        { success: false, error: `Cannot cancel order with status ${order.status}` },
        { status: 400 }
      );
    }

    const { symbol, side, segment, optionType, strikePrice, quantity } = order;
    const optionLabel = segment === 'OPTIONS' && optionType && strikePrice
      ? ` ${symbol} ${Math.round(Number(strikePrice))} ${optionType}`
      : ` ${symbol}`;

    // Release blocked margin: price * quantity back to availableMargin
    const marginToRelease = Number(order.price ?? 0) * quantity;
    const portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
    if (portfolio) {
      const newAvail = Number(portfolio.availableMargin) + marginToRelease;
      await db.portfolio.update({
        where: { userId: auth.userId },
        data: { availableMargin: { increment: marginToRelease } },
      });
      await db.transaction.create({
        data: {
          portfolioId: portfolio.id,
          type: 'CREDIT',
          amount: marginToRelease,
          balance: newAvail,
          description: `Margin released: LIMIT ${side}${optionLabel} cancelled`,
          reference: order.id,
        },
      });
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: { status: 'CANCELLED', reason: 'USER_CANCELLED' },
    });

    // Send notification
    await notifyTradeExecuted(
      auth.userId,
      symbol,
      side,
      quantity,
      Number(order.price ?? 0),
      order.id
    );

    const mappedOrder = {
      ...updatedOrder,
      price: Number(updatedOrder.price ?? 0),
      triggerPrice: Number(updatedOrder.triggerPrice ?? 0),
      filledPrice: Number(updatedOrder.filledPrice ?? 0),
      strikePrice: Number(updatedOrder.strikePrice ?? 0),
    };
    return NextResponse.json({ success: true, data: mappedOrder });
  } catch (error) {
    console.error('Cancel limit order error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel order' }, { status: 500 });
  }
}
