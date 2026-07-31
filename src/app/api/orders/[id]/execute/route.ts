import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { calculateBrokerage } from '@/lib/brokerage';
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
        { success: false, error: `Order is already ${order.status}` },
        { status: 400 }
      );
    }

    const { ltp } = await req.json();
    if (!ltp || typeof ltp !== 'number' || ltp <= 0) {
      return NextResponse.json({ success: false, error: 'Valid ltp is required' }, { status: 400 });
    }

    const fillPrice = ltp;
    const quantity = order.quantity;
    const orderValue = fillPrice * quantity;
    const brokerage = calculateBrokerage(orderValue);
    const { symbol, side, segment, stockId, optionType, strikePrice, expiry } = order;

    // Build option label for descriptions
    const optionLabel = segment === 'OPTIONS' && optionType && strikePrice
      ? ` ${symbol} ${Math.round(Number(strikePrice))} ${optionType}`
      : ` ${symbol}`;

    // --- Create Trade record ---
    await db.trade.create({
      data: {
        userId: auth.userId,
        stockId,
        orderId: order.id,
        symbol,
        side,
        quantity,
        price: fillPrice,
        segment,
        optionType,
        strikePrice,
        expiry,
        brokerage,
        type: side === 'BUY' ? 'OPEN' : 'CLOSE',
      },
    });

    // --- Handle BUY ---
    if (side === 'BUY') {
      const buyWhere: Record<string, unknown> = {
        userId: auth.userId,
        stockId,
        symbol,
        status: 'OPEN',
      };
      if (segment === 'OPTIONS') {
        buyWhere.optionType = optionType ?? undefined;
        buyWhere.strikePrice = strikePrice ?? undefined;
        if (expiry) {
          const dayStart = new Date(expiry);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          buyWhere.expiry = { gte: dayStart, lt: dayEnd };
        }
      }
      const existingPos = await db.position.findFirst({ where: buyWhere as never });

      if (existingPos) {
        const totalQty = existingPos.quantity + quantity;
        const totalValue = existingPos.avgPrice * existingPos.quantity + fillPrice * quantity;
        const newAvg = totalValue / totalQty;
        await db.position.update({
          where: { id: existingPos.id },
          data: {
            quantity: totalQty,
            avgPrice: newAvg,
            investedAmt: newAvg * totalQty,
          },
        });
      } else {
        await db.position.create({
          data: {
            userId: auth.userId,
            stockId,
            symbol,
            side: 'LONG',
            quantity,
            avgPrice: fillPrice,
            investedAmt: fillPrice * quantity,
            segment,
            optionType,
            strikePrice,
            expiry,
            instrumentKey: order.instrumentKey,
            stopLoss: null,
            target: null,
          },
        });
      }

      const portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
      if (portfolio) {
        const newBalance = Number(portfolio.totalBalance) - (orderValue + brokerage);
        await db.portfolio.update({
          where: { userId: auth.userId },
          data: {
            totalBalance: { decrement: orderValue + brokerage },
            investedAmount: { increment: orderValue },
          },
        });
        await db.transaction.create({
          data: {
            portfolioId: portfolio.id,
            type: 'DEBIT',
            amount: orderValue + brokerage,
            balance: newBalance,
            description: `Buy${optionLabel} · ${quantity} qty @ ₹${fillPrice.toFixed(2)} · Brokerage ₹${brokerage.toFixed(2)}`,
            reference: order.id,
          },
        });
      }
    }

    // --- Handle SELL ---
    if (side === 'SELL') {
      const posWhere: Record<string, unknown> = {
        userId: auth.userId,
        stockId,
        symbol,
        status: 'OPEN',
      };
      if (segment === 'OPTIONS') {
        posWhere.optionType = optionType ?? undefined;
        posWhere.strikePrice = strikePrice ?? undefined;
        if (expiry) {
          const dayStart = new Date(expiry);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          posWhere.expiry = { gte: dayStart, lt: dayEnd };
        }
      }
      const pos = await db.position.findFirst({ where: posWhere as never });
      if (!pos) {
        return NextResponse.json(
          { success: false, error: 'No open position found to close' },
          { status: 400 }
        );
      }

      const pnl = (fillPrice - pos.avgPrice) * quantity;
      await db.position.update({
        where: { id: pos.id },
        data: { status: 'SQUAREDOFF', exitPrice: fillPrice, exitReason: 'MANUAL', closedAt: new Date(), pnl },
      });

      const portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
      if (portfolio) {
        const newBalance = Number(portfolio.totalBalance) + (fillPrice * quantity);
        await db.portfolio.update({
          where: { userId: auth.userId },
          data: {
            totalBalance: { increment: fillPrice * quantity },
            investedAmount: { decrement: pos.investedAmt },
            totalPnl: { increment: pnl },
            realizedPnl: { increment: pnl },
            availableMargin: { increment: fillPrice * quantity },
          },
        });
        await db.transaction.create({
          data: {
            portfolioId: portfolio.id,
            type: 'CREDIT',
            amount: fillPrice * quantity,
            balance: newBalance,
            description: `Sell${optionLabel} · ${quantity} qty @ ₹${fillPrice.toFixed(2)}${pnl !== 0 ? ` · P&L ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}` : ''}`,
            reference: order.id,
          },
        });
      }
    }

    // --- Update order to FILLED ---
    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: 'FILLED',
        filledPrice: fillPrice,
        filledQty: quantity,
      },
    });

    // --- Send notification ---
    await notifyTradeExecuted(auth.userId, symbol, side, quantity, fillPrice, order.id);

    const mappedOrder = {
      ...updatedOrder,
      price: Number(updatedOrder.price ?? 0),
      triggerPrice: Number(updatedOrder.triggerPrice ?? 0),
      filledPrice: Number(updatedOrder.filledPrice ?? 0),
      strikePrice: Number(updatedOrder.strikePrice ?? 0),
    };
    return NextResponse.json({ success: true, data: mappedOrder });
  } catch (error) {
    console.error('Execute limit order error:', error);
    return NextResponse.json({ success: false, error: 'Failed to execute order' }, { status: 500 });
  }
}
