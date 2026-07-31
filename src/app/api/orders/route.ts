import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { calculateBrokerage } from '@/lib/brokerage';
import { hasFeature } from '@/lib/tier';
import {
  notifyTradeExecuted,
  notifyWelcome,
} from '@/lib/notifications';

const MOCK_LTP: Record<string, number> = {
  RELIANCE: 1882.75, TCS: 3945.60, INFY: 1568.30, HDFCBANK: 1685.20,
  ICICIBANK: 1245.80, SBIN: 828.45, BHARTIARTL: 1620.50, ITC: 468.25,
  HINDUNILVR: 2534.10, KOTAKBANK: 1789.30, LT: 3542.65, AXISBANK: 1168.40,
  BAJFINANCE: 7234.50, MARUTI: 12450.80, TATAMOTORS: 978.35, WIPRO: 572.60,
  HCLTECH: 1712.40, SUNPHARMA: 1824.15, TITAN: 3568.90, ADANIENT: 2890.45,
};

const ORDER_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
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
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { symbol, segment, side, type, orderType: orderTypeRaw, quantity, price, stopLoss, target, optionType, strikePrice, expiry, instrumentKey } = body;
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

    // Get fill price.
    // IMPORTANT for OPTIONS: the client must pass `price` = the option's live LTP
    // (premium). The indices NIFTY/SENSEX/BANKNIFTY/FINNIFTY are NOT in MOCK_LTP,
    // so without `price` they would default to 1000 — which inflates orderValue
    // 50x (e.g. ₹1000 × 50 qty = ₹50,000) and wrongly fails with "Insufficient
    // margin". We therefore prefer the client-supplied `price` for MARKET option
    // orders too.
    const ltp = MOCK_LTP[symbol] ?? 1000;
    const fillPrice = price ?? ltp;
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

    // Build option label for descriptions
    const optionLabel = segment === 'OPTIONS' && optionType && strikePrice
      ? ` ${symbol} ${Math.round(Number(strikePrice))} ${optionType}`
      : ` ${symbol}`;

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
        instrumentKey: instrumentKey ?? null,
      },
    });

    // For LIMIT/SL orders: block margin (deduct from availableMargin only)
    if (orderType !== 'MARKET') {
      const marginToBlock = Number(fillPrice) * quantity;
      await db.portfolio.update({
        where: { userId: auth.userId },
        data: { availableMargin: { decrement: marginToBlock } },
      });
      // Record margin-blocked transaction
      if (portfolio) {
        const newAvail = Number(portfolio.availableMargin) - marginToBlock;
        await db.transaction.create({
          data: {
            portfolioId: portfolio.id,
            type: 'DEBIT',
            amount: marginToBlock,
            balance: newAvail,
            description: `Margin blocked: LIMIT ${side}${optionLabel} @ ₹${Number(fillPrice).toFixed(2)}`,
            reference: order.id,
          },
        });
      }
    }

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
        /* Check if an OPEN position exists for the EXACT same instrument.
         * For OPTIONS, we must match by symbol + optionType + strikePrice +
         * expiry — otherwise two different strikes (e.g. NIFTY 21100 CE and
         * NIFTY 23500 CE) would get averaged into the SAME position row,
         * corrupting both avgPrice and instrumentKey. */
        const buyWhere: Record<string, unknown> = {
          userId: auth.userId,
          stockId: stock.id,
          symbol,
          status: 'OPEN',
        };
        if (segment === 'OPTIONS') {
          buyWhere.optionType = optionType ?? undefined;
          buyWhere.strikePrice = strikePrice ?? undefined;
          if (expiry) {
            const expDate = new Date(expiry);
            const dayStart = new Date(expDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            buyWhere.expiry = { gte: dayStart, lt: dayEnd };
          }
        }
        const existingPos = await db.position.findFirst({ where: buyWhere as never });

        if (existingPos) {
          // Average up
          const totalQty = existingPos.quantity + quantity;
          const totalValue = existingPos.avgPrice * existingPos.quantity + fillPrice * quantity;
          const newAvg = totalValue / totalQty;

          await db.position.update({
            where: { id: existingPos.id },
            data: {
              quantity: totalQty,
              avgPrice: newAvg,
              investedAmt: Number(newAvg) * totalQty,
              /* Always update instrumentKey if the incoming order has one and
               * either (a) the position doesn't have one, or (b) the incoming
               * key is different (the new order's key is the most recent and
               * therefore the most accurate source of truth). */
              ...(instrumentKey && existingPos.instrumentKey !== instrumentKey
                ? { instrumentKey }
                : {}),
            },
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
              /* Store the Upstox instrument_key passed by the client so the
               * PositionsPage can subscribe to live ticks for the EXACT
               * instrument (e.g. NSE_FO|63811 for NIFTY 32900 CE) without
               * needing to re-fetch the option chain to resolve the key. */
              instrumentKey: instrumentKey ?? null,
              stopLoss: stopLoss ?? null,
              target: target ?? null,
            },
          });
        }

        // Deduct from portfolio — totalBalance reflects cash on hand so it
        // drops when buying and rises when selling. availableMargin mirrors it
        // because the cash is no longer free.
        const portfolioBefore = await db.portfolio.findUnique({ where: { userId: auth.userId } });
        await db.portfolio.update({
          where: { userId: auth.userId },
          data: {
            totalBalance: { decrement: orderValue + brokerage },
            availableMargin: { decrement: orderValue + brokerage },
            investedAmount: { increment: orderValue },
          },
        });

        // Record DEBIT transaction for the buy
        if (portfolioBefore) {
          const newBalance = Number(portfolioBefore.totalBalance) - (orderValue + brokerage);
          await db.transaction.create({
            data: {
              portfolioId: portfolioBefore.id,
              type: 'DEBIT',
              amount: orderValue + brokerage,
              balance: newBalance,
              description: `Buy ${symbol} · ${quantity} qty @ ₹${fillPrice.toFixed(2)} · Brokerage ₹${brokerage.toFixed(2)}`,
              reference: order.id,
            },
          });
        }
      } else {
        // SELL: find open position and square off.
        // For OPTIONS we must match optionType + strikePrice + expiry as well,
        // otherwise selling a CE 24600 could wrongly close a CE 24500 position
        // that happens to share the same underlying symbol row.
        // IMPORTANT: brokerage is NOT charged on exit — it was already paid on the
        // buy side. This ensures that a round-trip trade with no P&L restores the
        // balance to exactly its pre-trade value (paper trading expectation).
        const posWhere: Record<string, unknown> = {
          userId: auth.userId,
          stockId: stock.id,
          symbol,
          status: 'OPEN',
        };
        if (segment === 'OPTIONS') {
          posWhere.optionType = optionType ?? undefined;
          posWhere.strikePrice = strikePrice ?? undefined;
          if (expiry) {
            // Match by calendar date (ignore time portion)
            const expDate = new Date(expiry);
            const dayStart = new Date(expDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            posWhere.expiry = { gte: dayStart, lt: dayEnd };
          }
        }
        const pos = await db.position.findFirst({ where: posWhere as never });
        if (pos) {
          const pnl = (fillPrice - pos.avgPrice) * quantity;
          await db.position.update({
            where: { id: pos.id },
            data: { status: 'SQUAREDOFF', exitPrice: fillPrice, exitReason: 'MANUAL', closedAt: new Date(), pnl },
          });
          const portfolioBefore = await db.portfolio.findUnique({ where: { userId: auth.userId } });
          await db.portfolio.update({
            where: { userId: auth.userId },
            data: {
              totalBalance: { increment: fillPrice * quantity },
              availableMargin: { increment: fillPrice * quantity },
              investedAmount: { decrement: pos.investedAmt },
              totalPnl: { increment: pnl },
              realizedPnl: { increment: pnl },
            },
          });
          // Record CREDIT transaction for the sell (no brokerage deduction)
          if (portfolioBefore) {
            const newBalance = Number(portfolioBefore.totalBalance) + (fillPrice * quantity);
            await db.transaction.create({
              data: {
                portfolioId: portfolioBefore.id,
                type: 'CREDIT',
                amount: fillPrice * quantity,
                balance: newBalance,
                description: `Sell ${symbol} · ${quantity} qty @ ₹${fillPrice.toFixed(2)}${pnl !== 0 ? ` · P&L ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}` : ''}`,
                reference: order.id,
              },
            });
          }
        }
      }
    }

    // Send notification for executed order
    if (orderType === 'MARKET') {
      await notifyTradeExecuted(auth.userId, symbol, side, quantity, fillPrice, order.id);
    }

    const mappedOrder = {
      ...order,
      price: Number(order.price ?? 0),
      triggerPrice: Number(order.triggerPrice ?? 0),
      filledPrice: Number(order.filledPrice ?? 0),
      strikePrice: Number(order.strikePrice ?? 0),
    };
    return NextResponse.json({ success: true, data: mappedOrder });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create order' }, { status: 500 });
  }
}
