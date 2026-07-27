import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { calculateBrokerage } from '@/lib/brokerage';
import { getPlatformToken } from '@/lib/upstox';

/* NOTE: We intentionally do NOT use any hard-coded MOCK_LTP table here.
 *
 * BUG THIS FIXES: Previously this route used `MOCK_LTP[position.symbol] ?? Number(position.currentPrice)`.
 * For an OPTIONS position (e.g. NIFTY 23900 CE):
 *   - `position.symbol` = 'NIFTY' which is NOT in MOCK_LTP → undefined
 *   - `position.currentPrice` = 0 (DB default, never updated by client)
 *   - So `exitPrice = 0` → P&L = (0 - avgPrice) * qty = huge LOSS
 *     e.g. (0 - 107.65) * 50 = -₹5,382 even though the user had +₹900 unrealized profit!
 *
 * FIX: The client (PositionsPage) sends the live LTP from its WebSocket subscription
 * in the request body as `exitPrice`. We use that as the authoritative exit price.
 *
 * FALLBACK CHAIN (if client didn't send exitPrice):
 *   1. Fetch live LTP from Upstox REST API using position.instrumentKey
 *   2. Use stored position.currentPrice if > 0
 *   3. Use position.avgPrice (worst case — produces P&L = 0, which is safe)
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    /* Parse the request body — client may send { exitPrice } with the live LTP. */
    let bodyExitPrice: number | undefined;
    try {
      const body = await req.json();
      if (typeof body?.exitPrice === 'number' && body.exitPrice > 0) {
        bodyExitPrice = body.exitPrice;
      }
    } catch {
      /* Body may be empty (legacy callers) — that's fine, we'll fall back. */
    }

    const position = await db.position.findFirst({
      where: { id, userId: auth.userId, status: 'OPEN' },
    });

    if (!position) {
      return NextResponse.json({ success: false, error: 'Position not found' }, { status: 404 });
    }

    /* ---------- Resolve exit price (LIVE LTP at square-off time) ---------- */
    let exitPrice: number;

    if (bodyExitPrice && bodyExitPrice > 0) {
      // Best: client sent the live WebSocket LTP — use it directly.
      exitPrice = bodyExitPrice;
    } else if (position.instrumentKey) {
      // Fallback 1: fetch live LTP from Upstox REST API.
      try {
        const token = await getPlatformToken(req);
        if (token) {
          const url = `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodeURIComponent(position.instrumentKey)}`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          });
          if (res.ok) {
            const json = await res.json();
            // Upstox returns { data: { [instrumentKey]: { last_price: number } } }
            const data = json?.data?.[position.instrumentKey];
            if (data && typeof data.last_price === 'number' && data.last_price > 0) {
              exitPrice = data.last_price;
            } else {
              exitPrice = Number(position.avgPrice); // give up → safe default
            }
          } else {
            exitPrice = Number(position.avgPrice);
          }
        } else {
          exitPrice = Number(position.avgPrice);
        }
      } catch {
        exitPrice = Number(position.avgPrice);
      }
    } else if (Number(position.currentPrice) > 0) {
      // Fallback 2: stored currentPrice (rarely set).
      exitPrice = Number(position.currentPrice);
    } else {
      // Worst case: use avgPrice → P&L = 0. Safe but not accurate.
      exitPrice = Number(position.avgPrice);
    }

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
        /* Also store the exitPrice as currentPrice so any future reads see it. */
        currentPrice: exitPrice,
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

    // Fetch portfolio BEFORE update so we can record the running balance.
    // Brokerage is NOT charged on exit — it was already paid on the buy side.
    // This guarantees a round-trip trade with no P&L restores the balance exactly.
    const portfolioBefore = await db.portfolio.findUnique({ where: { userId: auth.userId } });
    await db.portfolio.update({
      where: { userId: auth.userId },
      data: {
        totalBalance: { increment: orderValue },
        availableMargin: { increment: orderValue },
        investedAmount: { decrement: Number(position.investedAmt) },
        totalPnl: { increment: pnl },
        realizedPnl: { increment: pnl },
        totalTrades: { increment: 1 },
        winningTrades: { increment: pnl > 0 ? 1 : 0 },
      },
    });

    // Record a CREDIT transaction so user can see money flowing back into the wallet
    if (portfolioBefore) {
      const newBalance = Number(portfolioBefore.totalBalance) + orderValue;
      await db.transaction.create({
        data: {
          portfolioId: portfolioBefore.id,
          type: 'CREDIT',
          amount: orderValue,
          balance: newBalance,
          description: `Exit ${position.symbol} · ${position.quantity} qty @ ₹${exitPrice.toFixed(2)}${pnl !== 0 ? ` · P&L ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)}` : ''}`,
          reference: position.id,
        },
      });
    }

    const updated = await db.position.findUnique({ where: { id } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Square off error:', error);
    return NextResponse.json({ success: false, error: 'Failed to square off position' }, { status: 500 });
  }
}
