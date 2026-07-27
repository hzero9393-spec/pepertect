import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { experience, goal, capital, markets } = body;

    const authHeader = req.headers.get('authorization');
    const token = authHeader ? extractBearerToken(authHeader) : null;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    /* ---- Save preferences ---- */
    const preferences: Record<string, unknown> = {
      experience,
      goal,
      markets,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
    };
    const existingPrefs = user.notifSettings as Record<string, unknown> | null;
    const mergedPrefs = existingPrefs ? { ...existingPrefs, ...preferences } : preferences;

    await db.user.update({
      where: { id: payload.userId },
      data: {
        virtualCapital: capital || 100000,
        notifSettings: mergedPrefs,
      },
    });

    /* ---- Activate free trial (PREMIUM for 30 days) ---- */
    // Check if trial already exists
    const existingTrial = await db.subscription.findFirst({
      where: { userId: payload.userId, razorpaySubId: 'TRIAL' },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingTrial) {
      // Check if user already has a paid PREMIUM subscription
      const paidSub = await db.subscription.findFirst({
        where: { userId: payload.userId, status: 'ACTIVE', plan: 'PREMIUM' },
      });

      if (!paidSub) {
        const now = new Date();
        const endDate = new Date(now.getTime() + TRIAL_DURATION_MS);

        await db.subscription.create({
          data: {
            userId: payload.userId,
            plan: 'PREMIUM',
            status: 'ACTIVE',
            startDate: now,
            endDate,
            autoRenew: false,
            razorpaySubId: 'TRIAL',
          },
        });

        // Upgrade tier to PREMIUM
        await db.user.update({
          where: { id: payload.userId },
          data: { tier: 'PREMIUM' },
        });
      }
    }

    /* ---- Update portfolio balance ---- */
    const chosenCapital = capital || 100000;
    const portfolio = await db.portfolio.findUnique({ where: { userId: payload.userId } });

    if (portfolio) {
      const prevBalance = Number(portfolio.totalBalance);
      const uplift = chosenCapital - prevBalance;

      await db.portfolio.update({
        where: { userId: payload.userId },
        data: {
          totalBalance: chosenCapital,
          availableMargin: { increment: Math.max(0, uplift) },
        },
      });

      // Record transaction
      if (uplift > 0) {
        const updated = await db.portfolio.findUnique({ where: { userId: payload.userId } });
        await db.transaction.create({
          data: {
            portfolioId: portfolio.id,
            type: 'CREDIT',
            amount: uplift,
            balance: Number(updated?.totalBalance ?? chosenCapital),
            description: `Free trial activated — Virtual capital set to ₹${chosenCapital.toLocaleString('en-IN')}`,
          },
        });
      }
    } else {
      // Create portfolio if it doesn't exist
      const newPortfolio = await db.portfolio.create({
        data: {
          userId: payload.userId,
          totalBalance: chosenCapital,
          availableMargin: chosenCapital,
        },
      });
      await db.transaction.create({
        data: {
          portfolioId: newPortfolio.id,
          type: 'CREDIT',
          amount: chosenCapital,
          balance: chosenCapital,
          description: `Free trial activated — Initial virtual capital ₹${chosenCapital.toLocaleString('en-IN')}`,
        },
      });
    }

    /* ---- Add selected markets to watchlist ---- */
    if (markets && Array.isArray(markets)) {
      for (const market of markets) {
        const symbolMap: Record<string, string> = {
          stocks: 'NIFTY 50',
          options: 'NIFTY 50',
          futures: 'NIFTY 50',
        };
        const symbol = symbolMap[market] || 'NIFTY 50';
        const marketStock = await db.stock.findFirst({ where: { symbol } });
        if (marketStock) {
          const existing = await db.watchlist.findUnique({
            where: { userId_stockId: { userId: payload.userId, stockId: marketStock.id } },
          });
          if (!existing) {
            await db.watchlist.create({
              data: { userId: payload.userId, stockId: marketStock.id },
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Free trial activated successfully',
    });
  } catch (error) {
    console.error('Onboarding activation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to activate trial',
    }, { status: 500 });
  }
}
