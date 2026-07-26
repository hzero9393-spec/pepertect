import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { calculateBrokerage } from '@/lib/brokerage';

const MOCK_LTP: Record<string, number> = {
  RELIANCE: 1882.75, TCS: 3945.60, INFY: 1568.30, HDFCBANK: 1685.20,
  ICICIBANK: 1245.80, SBIN: 828.45, BHARTIARTL: 1620.50, ITC: 468.25,
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const position = await db.position.findFirst({
      where: { id, userId: auth.userId, status: 'OPEN' },
    });

    if (!position) {
      return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
    }

    const exitPrice = MOCK_LTP[position.symbol] ?? Number(position.currentPrice);
    const pnl = (exitPrice - Number(position.avgPrice)) * position.quantity * (position.side === 'LONG' ? 1 : -1);
    const orderValue = exitPrice * position.quantity;
    const brokerage = calculateBrokerage(orderValue);

    await db.position.update({
      where: { id },
      data: {
        status: 'SQUAREDOFF',
        exitPrice,
        exitReason: 'MANUAL',
        closedAt: new Date(),
        pnl,
      },
    });

    await db.trade.create({
      data: {
        userId: auth.userId,
        stockId: position.stockId,
        positionId: position.id,
        symbol: position.symbol,
        side: 'SELL',
        quantity: position.quantity,
        price: exitPrice,
        segment: position.segment,
        optionType: position.optionType,
        strikePrice: position.strikePrice,
        expiry: position.expiry,
        pnl,
        brokerage,
        type: 'CLOSE',
      },
    });

    await db.portfolio.update({
      where: { userId: auth.userId },
      data: {
        availableMargin: { increment: orderValue - brokerage },
        investedAmount: { decrement: Number(position.investedAmt) },
        totalPnl: { increment: pnl },
        realizedPnl: { increment: pnl },
        totalTrades: { increment: 1 },
        winningTrades: { increment: pnl > 0 ? 1 : 0 },
      },
    });

    const updated = await db.position.findUnique({ where: { id } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Square off error:', error);
    return NextResponse.json({ success: false, error: 'Failed to square off position' }, { status: 500 });
  }
}
