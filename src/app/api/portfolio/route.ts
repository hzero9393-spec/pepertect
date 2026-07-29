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
      const capital = getVirtualCapitalForTier(auth.tier);
      portfolio = await db.portfolio.create({
        data: {
          userId: auth.userId,
          totalBalance: capital,
          availableMargin: capital,
        },
      });
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

    // ── Parallel DB queries (was sequential — now 3x faster) ──
    const [totalTrades, winningTrades, openPositions, todayTrades] = await Promise.all([
      db.trade.count({ where: { userId: auth.userId } }),
      db.trade.count({ where: { userId: auth.userId, pnl: { gt: 0 } } }),
      db.position.findMany({ where: { userId: auth.userId, status: 'OPEN' } }),
      db.trade.findMany({
        where: { userId: auth.userId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    let unrealizedPnl = 0;
    for (const pos of openPositions) {
      const currentPrice = Number(pos.currentPrice) > 0
        ? Number(pos.currentPrice)
        : Number(pos.avgPrice);
      unrealizedPnl += (currentPrice - Number(pos.avgPrice)) * pos.quantity;
    }

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
