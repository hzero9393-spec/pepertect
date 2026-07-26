import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { getVirtualCapitalForTier } from '@/lib/tier';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
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
