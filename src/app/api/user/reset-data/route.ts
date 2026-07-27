import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { FREE_VIRTUAL_CAPITAL } from '@/lib/tier';

/**
 * POST /api/user/reset-data
 * Resets the user's trading data: deletes all orders, positions, trades,
 * watchlist, and resets the portfolio back to the initial virtual capital.
 *
 * This does NOT touch:
 *  - the user account itself (email, password, avatar, etc.)
 *  - subscriptions (FREE/PREMIUM status preserved)
 *  - learning progress
 *  - notifications
 *
 * Body: { confirm: true } — required to prevent accidental resets.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    if (!body || body.confirm !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirmation required. Pass { confirm: true } in the body to reset.',
        },
        { status: 400 }
      );
    }

    const userId = auth.userId;

    // 1) Delete all the user's trades (must come first because of FK refs)
    await db.trade.deleteMany({ where: { userId } }).catch(() => {});

    // 2) Delete all open & closed positions
    await db.position.deleteMany({ where: { userId } }).catch(() => {});

    // 3) Delete all orders
    await db.order.deleteMany({ where: { userId } }).catch(() => {});

    // 4) Clear watchlist
    await db.watchlist.deleteMany({ where: { userId } }).catch(() => {});

    // 5) Delete transactions tied to portfolio
    const portfolio = await db.portfolio.findUnique({ where: { userId } });
    if (portfolio) {
      await db.transaction.deleteMany({ where: { portfolioId: portfolio.id } }).catch(() => {});

      // 6) Reset portfolio to initial virtual capital
      await db.portfolio.update({
        where: { userId },
        data: {
          totalBalance: FREE_VIRTUAL_CAPITAL,
          investedAmount: 0,
          availableMargin: FREE_VIRTUAL_CAPITAL,
          totalPnl: 0,
          realizedPnl: 0,
          unrealizedPnl: 0,
          dayPnl: 0,
          winRate: 0,
          totalTrades: 0,
          winningTrades: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'All trading data has been reset to defaults.',
      data: {
        virtualCapital: FREE_VIRTUAL_CAPITAL,
        resetAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Reset data error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset user data' },
      { status: 500 }
    );
  }
}
