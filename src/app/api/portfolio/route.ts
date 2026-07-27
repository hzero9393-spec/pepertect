import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { getVirtualCapitalForTier, FREE_VIRTUAL_CAPITAL, PREMIUM_VIRTUAL_CAPITAL } from '@/lib/tier';

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    let portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });

    if (!portfolio) {
      // Plan-based capital: FREE → ₹10,000, PREMIUM → ₹1,00,000
      const capital = getVirtualCapitalForTier(auth.tier);
      portfolio = await db.portfolio.create({
        data: {
          userId: auth.userId,
          totalBalance: capital,
          availableMargin: capital,
        },
      });
      // Record the initial capital as a CREDIT transaction so the wallet history
      // shows where the starting balance came from.
      await db.transaction.create({
        data: {
          portfolioId: portfolio.id,
          type: 'CREDIT',
          amount: capital,
          balance: capital,
          description: `Initial virtual capital · ${auth.tier === 'PREMIUM' ? 'Premium' : 'Free'} plan`,
        },
      });
    } else {
      /* One-time migration: previously FREE users were seeded with ₹1,00,000.
         If the user is FREE, has the legacy ₹1L starting balance, and has never
         traded, reset them down to ₹10,000 (the correct free-plan capital). */
      const isLegacyFree =
        auth.tier !== 'PREMIUM' &&
        Number(portfolio.totalBalance) === PREMIUM_VIRTUAL_CAPITAL &&
        Number(portfolio.investedAmount) === 0 &&
        Number(portfolio.realizedPnl) === 0;
      if (isLegacyFree) {
        portfolio = await db.portfolio.update({
          where: { userId: auth.userId },
          data: {
            totalBalance: FREE_VIRTUAL_CAPITAL,
            availableMargin: FREE_VIRTUAL_CAPITAL,
          },
        });
        await db.transaction.create({
          data: {
            portfolioId: portfolio.id,
            type: 'CREDIT',
            amount: FREE_VIRTUAL_CAPITAL,
            balance: FREE_VIRTUAL_CAPITAL,
            description: 'Initial virtual capital · Free plan (reset)',
          },
        });
      }
    }

    const totalTrades = await db.trade.count({ where: { userId: auth.userId } });
    const winningTrades = await db.trade.count({
      where: { userId: auth.userId, pnl: { gt: 0 } },
    });
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Calculate unrealized P&L from open positions
    const MOCK_LTP: Record<string, number> = {
      RELIANCE: 1882.75, TCS: 3945.60, INFY: 1568.30, HDFCBANK: 1685.20,
      ICICIBANK: 1245.80, SBIN: 828.45, ITC: 468.25,
    };

    const openPositions = await db.position.findMany({
      where: { userId: auth.userId, status: 'OPEN' },
    });

    let unrealizedPnl = 0;
    for (const pos of openPositions) {
      const currentPrice = MOCK_LTP[pos.symbol] ?? Number(pos.currentPrice);
      unrealizedPnl += (currentPrice - Number(pos.avgPrice)) * pos.quantity;
    }

    // Calculate today's realized P&L from trades executed today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTrades = await db.trade.findMany({
      where: { userId: auth.userId, createdAt: { gte: startOfToday } },
    });
    const todayRealizedPnl = todayTrades.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);
    const todayPnl = todayRealizedPnl + unrealizedPnl;

    return NextResponse.json({
      success: true,
      data: {
        totalBalance: Number(portfolio.totalBalance),
        investedAmount: Number(portfolio.investedAmount),
        availableMargin: Number(portfolio.availableMargin),
        totalPnl: Number(portfolio.totalPnl),
        realizedPnl: Number(portfolio.realizedPnl),
        unrealizedPnl: parseFloat(unrealizedPnl.toFixed(2)),
        dayPnl: Number(portfolio.dayPnl),
        todayRealizedPnl: parseFloat(todayRealizedPnl.toFixed(2)),
        todayPnl: parseFloat(todayPnl.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(1)),
        totalTrades,
        winningTrades,
      },
    });
  } catch (error) {
    console.error('Fetch portfolio error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}
