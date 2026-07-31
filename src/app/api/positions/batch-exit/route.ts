import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { calculateBrokerage } from '@/lib/brokerage';

/**
 * Batch Exit API — closes multiple positions in a single transaction.
 *
 * POST body:
 *   {
 *     positionIds: string[],
 *     exitPrices?: Record<string, number>  // positionId -> live LTP
 *   }
 *
 * Returns:
 *   { success: true, results: Array<{ id, success, error? }> }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { positionIds, exitPrices = {} } = body as {
      positionIds?: string[];
      exitPrices?: Record<string, number>;
    };

    if (!Array.isArray(positionIds) || positionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'positionIds must be a non-empty array' },
        { status: 400 },
      );
    }

    if (positionIds.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 positions per batch' },
        { status: 400 },
      );
    }

    // Fetch all OPEN positions for this user that match the requested IDs
    const positions = await db.position.findMany({
      where: {
        id: { in: positionIds },
        userId: auth.userId,
        status: 'OPEN',
      },
    });

    if (positions.length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Fetch portfolio once before the transaction
    const portfolioBefore = await db.portfolio.findUnique({
      where: { userId: auth.userId },
    });

    // Execute all exits in a single Prisma transaction
    const results = await db.$transaction(
      async (tx) => {
        const out: Array<{ id: string; success: boolean; error?: string }> = [];
        let totalOrderValue = 0;
        let totalPnl = 0;
        let totalInvested = 0;
        let totalWinningTrades = 0;
        let totalTrades = 0;

        for (const position of positions) {
          // Resolve exit price: client-sent LTP > stored currentPrice > avgPrice
          let exitPrice: number;
          const clientPrice = exitPrices[position.id];
          if (typeof clientPrice === 'number' && clientPrice > 0) {
            exitPrice = clientPrice;
          } else if (Number(position.currentPrice) > 0) {
            exitPrice = Number(position.currentPrice);
          } else {
            exitPrice = Number(position.avgPrice);
          }

          const pnl =
            (exitPrice - Number(position.avgPrice)) *
            position.quantity *
            (position.side === 'LONG' ? 1 : -1);
          const orderValue = exitPrice * position.quantity;
          const brokerage = calculateBrokerage(orderValue);

          // Update position
          await tx.position.update({
            where: { id: position.id },
            data: {
              status: 'SQUAREDOFF',
              exitPrice,
              exitReason: 'MANUAL',
              closedAt: new Date(),
              pnl,
              currentPrice: exitPrice,
            },
          });

          // Create closing trade record
          await tx.trade.create({
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

          // Accumulate portfolio deltas
          totalOrderValue += orderValue;
          totalPnl += pnl;
          totalInvested += Number(position.investedAmt);
          totalTrades += 1;
          if (pnl > 0) totalWinningTrades += 1;

          out.push({ id: position.id, success: true });
        }

        // Single portfolio update for all positions
        await tx.portfolio.update({
          where: { userId: auth.userId },
          data: {
            totalBalance: { increment: totalOrderValue },
            availableMargin: { increment: totalOrderValue },
            investedAmount: { decrement: totalInvested },
            totalPnl: { increment: totalPnl },
            realizedPnl: { increment: totalPnl },
            totalTrades: { increment: totalTrades },
            winningTrades: { increment: totalWinningTrades },
          },
        });

        // Create a single CREDIT transaction for the batch
        if (portfolioBefore) {
          const newBalance =
            Number(portfolioBefore.totalBalance) + totalOrderValue;
          await tx.transaction.create({
            data: {
              portfolioId: portfolioBefore.id,
              type: 'CREDIT',
              amount: totalOrderValue,
              balance: newBalance,
              description: `Batch exit ${positions.length} position(s) · P&L ${totalPnl >= 0 ? '+' : ''}₹${totalPnl.toFixed(2)}`,
              reference: `batch:${positions.map((p) => p.id).join(',')}`,
            },
          });
        }

        return out;
      },
      { timeout: 30000 }, // 30s timeout for large batches
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Batch exit error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to batch-exit positions' },
      { status: 500 },
    );
  }
}
