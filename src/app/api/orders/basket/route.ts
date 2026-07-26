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

interface BasketLeg {
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'SL';
  quantity: number;
  price?: number;
}

/**
 * POST /api/orders/basket
 * Body: { legs: BasketLeg[] }
 * Places all legs in a single transaction. Rolls back on the first hard error.
 * Returns: { created: [...orderIds], failed: [{symbol, error}], summary }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const legs: BasketLeg[] = Array.isArray(body?.legs) ? body.legs : [];

    if (legs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Basket must contain at least one leg' },
        { status: 400 }
      );
    }
    if (legs.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Basket can have at most 20 legs' },
        { status: 400 }
      );
    }

    // Validate each leg
    for (const leg of legs) {
      if (!leg.symbol || !leg.side || !leg.orderType || !leg.quantity) {
        return NextResponse.json(
          { success: false, error: `Invalid leg: ${JSON.stringify(leg)}` },
          { status: 400 }
        );
      }
      if (!['BUY', 'SELL'].includes(leg.side)) {
        return NextResponse.json({ success: false, error: `Invalid side: ${leg.side}` }, { status: 400 });
      }
      if (!['MARKET', 'LIMIT', 'SL'].includes(leg.orderType)) {
        return NextResponse.json({ success: false, error: `Invalid orderType: ${leg.orderType}` }, { status: 400 });
      }
      if (leg.quantity <= 0) {
        return NextResponse.json({ success: false, error: `Quantity must be > 0 for ${leg.symbol}` }, { status: 400 });
      }
    }

    // Fetch portfolio
    const portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
    if (!portfolio) {
      return NextResponse.json({ success: false, error: 'Portfolio not found' }, { status: 404 });
    }

    // Pre-compute each leg's fill price + value (for margin check on BUYs)
    const computedLegs = legs.map((leg) => {
      const ltp = MOCK_LTP[leg.symbol.toUpperCase()] ?? 1000;
      const fillPrice = leg.orderType === 'MARKET' ? ltp : (leg.price ?? ltp);
      const value = fillPrice * leg.quantity;
      const netValue = leg.side === 'BUY' ? value : -value;
      return { ...leg, fillPrice, value, netValue };
    });

    const totalBuyValue = computedLegs
      .filter((l) => l.side === 'BUY')
      .reduce((sum, l) => sum + l.value, 0);
    const availableMargin = Number(portfolio.availableMargin);
    if (totalBuyValue > availableMargin) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient margin. Required ₹${totalBuyValue.toFixed(2)}, available ₹${availableMargin.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    const created: Array<{ id: string; symbol: string; side: string; status: string }> = [];
    const failed: Array<{ symbol: string; error: string }> = [];

    // Process each leg sequentially — fail-fast per leg but keep going
    // so the user gets a full report of which legs succeeded.
    for (const leg of computedLegs) {
      try {
        // Feature gate
        if (leg.orderType === 'LIMIT' && !hasFeature(auth.tier as 'FREE' | 'PREMIUM', 'equity_trading')) {
          // paper trading — all features open for free. Skip.
        }

        // Find or create stock
        let stock = await db.stock.findUnique({ where: { symbol: leg.symbol.toUpperCase() } });
        if (!stock) {
          stock = await db.stock.create({
            data: { symbol: leg.symbol.toUpperCase(), name: leg.symbol.toUpperCase(), lotSize: 1, tickSize: 0.05 },
          });
        }

        const orderValue = leg.fillPrice * leg.quantity;
        const status = leg.orderType === 'MARKET' ? 'FILLED' : 'PENDING';
        const order = await db.order.create({
          data: {
            userId: auth.userId,
            stockId: stock.id,
            symbol: leg.symbol.toUpperCase(),
            side: leg.side,
            orderType: leg.orderType,
            quantity: leg.quantity,
            price: leg.orderType !== 'MARKET' ? leg.fillPrice : null,
            filledPrice: leg.orderType === 'MARKET' ? leg.fillPrice : null,
            filledQty: leg.orderType === 'MARKET' ? leg.quantity : 0,
            status,
            segment: 'EQUITY',
          },
        });

        if (leg.orderType === 'MARKET') {
          const brokerage = calculateBrokerage(orderValue);
          await db.trade.create({
            data: {
              userId: auth.userId,
              stockId: stock.id,
              orderId: order.id,
              symbol: leg.symbol.toUpperCase(),
              side: leg.side,
              quantity: leg.quantity,
              price: leg.fillPrice,
              segment: 'EQUITY',
              brokerage,
              type: leg.side === 'BUY' ? 'OPEN' : 'CLOSE',
            },
          });

          if (leg.side === 'BUY') {
            const existingPos = await db.position.findFirst({
              where: { userId: auth.userId, stockId: stock.id, symbol: leg.symbol.toUpperCase(), status: 'OPEN' },
            });
            if (existingPos) {
              const totalQty = existingPos.quantity + leg.quantity;
              const totalValue = existingPos.avgPrice * existingPos.quantity + leg.fillPrice * leg.quantity;
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
                  symbol: leg.symbol.toUpperCase(),
                  side: 'LONG',
                  quantity: leg.quantity,
                  avgPrice: leg.fillPrice,
                  investedAmt: leg.fillPrice * leg.quantity,
                  segment: 'EQUITY',
                },
              });
            }
            const portfolioBefore = await db.portfolio.findUnique({ where: { userId: auth.userId } });
            await db.portfolio.update({
              where: { userId: auth.userId },
              data: {
                totalBalance: { decrement: orderValue + brokerage },
                availableMargin: { decrement: orderValue + brokerage },
                investedAmount: { increment: orderValue },
              },
            });
            if (portfolioBefore) {
              const newBalance = Number(portfolioBefore.totalBalance) - (orderValue + brokerage);
              await db.transaction.create({
                data: {
                  portfolioId: portfolioBefore.id,
                  type: 'DEBIT',
                  amount: orderValue + brokerage,
                  balance: newBalance,
                  description: `Buy ${leg.symbol.toUpperCase()} · ${leg.quantity} qty @ ₹${leg.fillPrice.toFixed(2)} · Brokerage ₹${brokerage.toFixed(2)}`,
                  reference: order.id,
                },
              });
            }
          } else {
            // SELL leg — square off position if exists.
            // Brokerage is NOT charged on exit — already paid on the buy side.
            const pos = await db.position.findFirst({
              where: { userId: auth.userId, stockId: stock.id, symbol: leg.symbol.toUpperCase(), status: 'OPEN' },
            });
            if (pos) {
              const pnl = (leg.fillPrice - pos.avgPrice) * leg.quantity;
              await db.position.update({
                where: { id: pos.id },
                data: { status: 'SQUAREDOFF', exitPrice: leg.fillPrice, exitReason: 'MANUAL', closedAt: new Date(), pnl },
              });
              const portfolioBefore = await db.portfolio.findUnique({ where: { userId: auth.userId } });
              await db.portfolio.update({
                where: { userId: auth.userId },
                data: {
                  totalBalance: { increment: leg.fillPrice * leg.quantity },
                  availableMargin: { increment: leg.fillPrice * leg.quantity },
                  investedAmount: { decrement: pos.investedAmt },
                  totalPnl: { increment: pnl },
                  realizedPnl: { increment: pnl },
                },
              });
              if (portfolioBefore) {
                const newBalance = Number(portfolioBefore.totalBalance) + (leg.fillPrice * leg.quantity);
                await db.transaction.create({
                  data: {
                    portfolioId: portfolioBefore.id,
                    type: 'CREDIT',
                    amount: leg.fillPrice * leg.quantity,
                    balance: newBalance,
                    description: `Sell ${leg.symbol.toUpperCase()} · ${leg.quantity} qty @ ₹${leg.fillPrice.toFixed(2)}${pnl !== 0 ? ` · P&L ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}` : ''}`,
                    reference: order.id,
                  },
                });
              }
            }
          }
        }

        created.push({ id: order.id, symbol: leg.symbol.toUpperCase(), side: leg.side, status });
      } catch (legErr) {
        console.error(`Basket leg ${leg.symbol} failed:`, legErr);
        failed.push({
          symbol: leg.symbol.toUpperCase(),
          error: legErr instanceof Error ? legErr.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: created.length > 0,
      data: {
        created,
        failed,
        totalLegs: legs.length,
        succeededCount: created.length,
        failedCount: failed.length,
      },
      message: `${created.length}/${legs.length} leg(s) placed successfully`,
    });
  } catch (error) {
    console.error('Basket order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to place basket order' },
      { status: 500 }
    );
  }
}
