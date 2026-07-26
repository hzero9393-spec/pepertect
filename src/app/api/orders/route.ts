import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { calculateBrokerage } from '@/lib/brokerage';
import { hasFeature } from '@/lib/tier';

const MOCK_LTP: Record<string, number> = {
  RELIANCE: 1882.75, TCS: 3945.60, INFY: 1568.30, HDFCBANK: 1685.20,
  ICICIBANK: 1245.80, SBIN: 828.45, BHARTIARTL: 1620.50, ITC: 468.25,
  HINDUNILVR: 2534.10, KOTAKBANK: 1789.30, LT: 3542.65, AXISBANK: 1168.40,
  BAJFINANCE: 7234.50, MARUTI: 12450.80, TATAMOTORS: 978.35, WIPRO: 572.60,
  HCLTECH: 1712.40, SUNPHARMA: 1824.15, TITAN: 3568.90, ADANIENT: 2890.45,
};

const ORDER_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const cutoff = new Date(Date.now() - ORDER_RETENTION_MS);

    /* ---------- 24h retention: delete orders older than 24h ----------
       Also auto-cancel any PENDING order older than 24h before deletion. */
    await db.order.updateMany({
      where: { userId: auth.userId, status: 'PENDING', createdAt: { lt: cutoff } },
      data: { status: 'CANCELLED', reason: 'AUTO_EXPIRED_24H' },
    });
    await db.order.deleteMany({
      where: { userId: auth.userId, createdAt: { lt: cutoff } },
    });

    const orders = await db.order.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const mapped = orders.map((o) => ({
      ...o,
      price: Number(o.price ?? 0),
      triggerPrice: Number(o.triggerPrice ?? 0),
      filledPrice: Number(o.filledPrice ?? 0),
      strikePrice: Number(o.strikePrice ?? 0),
    }));
    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { symbol, segment, side, type, orderType: orderTypeRaw, quantity, price, stopLoss, target, optionType, strikePrice, expiry } = body;
    const orderType = orderTypeRaw ?? type; // accept both `orderType` and `type`

    // Feature check
    if (segment === 'FUTURES' && !hasFeature(auth.tier as 'FREE' | 'PREMIUM', 'futures_trading')) {
      return NextResponse.json({ success: false, error: 'Futures trading requires Premium' }, { status: 403 });
    }
    if (segment === 'OPTIONS' && !hasFeature(auth.tier as 'FREE' | 'PREMIUM', 'options_trading')) {
      return NextResponse.json({ success: false, error: 'Options trading requires Premium' }, { status: 403 });
    }

    // Find or create stock
    let stock = await db.stock.findUnique({ where: { symbol } });
    if (!stock) {
      stock = await db.stock.create({
        data: { symbol, name: symbol, lotSize: 1, tickSize: 0.05 },
      });
    }

    // Get fill price
    const ltp = MOCK_LTP[symbol] ?? 1000;
    const fillPrice = orderType === 'MARKET' ? ltp : (price ?? ltp);
    const orderValue = fillPrice * quantity;

    // Check balance
    const portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
    if (!portfolio) {
      return NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 });
    }
    const availableMargin = Number(portfolio.availableMargin);
    if (side === 'BUY' && orderValue > availableMargin) {
      return NextResponse.json({ success: false, error: 'Insufficient margin' }, { status: 400 });
    }

    // Create order
    const status = orderType === 'MARKET' ? 'FILLED' : 'PENDING';
    const order = await db.order.create({
      data: {
        userId: auth.userId,
        stockId: stock.id,
        symbol,
        side,
        orderType,
        quantity,
        price: orderType !== 'MARKET' ? fillPrice : null,
        filledPrice: orderType === 'MARKET' ? fillPrice : null,
        filledQty: orderType === 'MARKET' ? quantity : 0,
        status,
        segment,
        optionType: optionType ?? null,
        strikePrice: strikePrice ?? null,
        expiry: expiry ? new Date(expiry) : null,
      },
    });

    // For market orders: create/update position and trade
    if (orderType === 'MARKET') {
      const brokerage = calculateBrokerage(orderValue);

      // Create trade
      await db.trade.create({
        data: {
          userId: auth.userId,
          stockId: stock.id,
          orderId: order.id,
          symbol,
          side,
          quantity,
          price: fillPrice,
          segment,
          optionType: optionType ?? null,
          strikePrice: strikePrice ?? null,
          expiry: expiry ? new Date(expiry) : null,
          brokerage,
          type: side === 'BUY' ? 'OPEN' : 'CLOSE',
        },
      });

      if (side === 'BUY') {
        // Check if position exists
        const existingPos = await db.position.findFirst({
          where: { userId: auth.userId, stockId: stock.id, symbol, status: 'OPEN' },
        });

        if (existingPos) {
          // Average up
          const totalQty = existingPos.quantity + quantity;
          const totalValue = existingPos.avgPrice * existingPos.quantity + fillPrice * quantity;
          const newAvg = totalValue / totalQty;

          await db.position.update({
            where: { id: existingPos.id },
            data: { quantity: totalQty, avgPrice: newAvg, investedAmt: Number(newAvg) * totalQty },
          });
        } else {
          await db.position.create({
            data: {
              userId: auth.userId,
              stockId: stock.id,
              symbol,
              side: 'LONG',
              quantity,
              avgPrice: fillPrice,
              investedAmt: fillPrice * quantity,
              segment,
              optionType: optionType ?? null,
              strikePrice: strikePrice ?? null,
              expiry: expiry ? new Date(expiry) : null,
              stopLoss: stopLoss ?? null,
              target: target ?? null,
            },
          });
        }

        // Deduct from portfolio — totalBalance reflects cash on hand so it
        // drops when buying and rises when selling. availableMargin mirrors it
        // because the cash is no longer free.
        await db.portfolio.update({
          where: { userId: auth.userId },
          data: {
            totalBalance: { decrement: orderValue + brokerage },
            availableMargin: { decrement: orderValue + brokerage },
            investedAmount: { increment: orderValue },
          },
        });
      } else {
        // SELL: find open position and square off
        const pos = await db.position.findFirst({
          where: { userId: auth.userId, stockId: stock.id, symbol, status: 'OPEN' },
        });
        if (pos) {
          const pnl = (fillPrice - pos.avgPrice) * quantity;
          await db.position.update({
            where: { id: pos.id },
            data: { status: 'SQUAREDOFF', exitPrice: fillPrice, exitReason: 'MANUAL', closedAt: new Date(), pnl },
          });
          await db.portfolio.update({
            where: { userId: auth.userId },
            data: {
              totalBalance: { increment: fillPrice * quantity - brokerage },
              availableMargin: { increment: fillPrice * quantity - brokerage },
              investedAmount: { decrement: pos.investedAmt },
              totalPnl: { increment: pnl },
              realizedPnl: { increment: pnl },
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}
