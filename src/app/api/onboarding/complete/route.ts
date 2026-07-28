import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { experience, goal, capital, markets } = body;

    console.log('Onboarding request received:', { experience, goal, capital, markets });

    const authHeader = req.headers.get('authorization');
    const token = authHeader ? extractBearerToken(authHeader) : null;
    const payload = token ? verifyToken(token) : null;

    console.log('Auth payload:', payload ? { userId: payload.userId, email: payload.email } : null);

    if (!payload) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    console.log('User found:', user.id);

    // ============================================
    // PRE-CHECK: Has this user already used FREE TRIAL?
    // Only block if trial was EXPIRED (actually used and ended)
    // Allow if: no trial exists OR trial is still active (just update preferences)
    // ============================================
    console.log('Checking if user already used free trial...');
    
    const existingTrial = await db.subscription.findFirst({
      where: { 
        userId: payload.userId,
        razorpaySubId: 'TRIAL'
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingTrial) {
      console.log('⚠️ User already has trial record:', existingTrial.id, 'status:', existingTrial.status);
      
      // Check if trial is still active
      const now = new Date();
      const trialEndsAt = new Date(existingTrial.startDate.getTime() + TRIAL_DURATION_MS);
      
      if (existingTrial.status === 'ACTIVE' && now < trialEndsAt) {
        // Trial is STILL ACTIVE - save preferences but don't create new trial
        console.log('Trial still active, updating preferences only...');
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
            virtualCapital: capital || user.virtualCapital || 100000,
            notifSettings: mergedPrefs,
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Preferences updated! Your trial is already active.',
          trialActivated: false, // Was already active
          trialStatus: {
            active: true,
            endsAt: trialEndsAt.toISOString(),
            daysLeft: Math.floor((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
          }
        });
      }
      
      // Trial was EXPIRED or CANCELLED - actually used before
      if (now >= trialEndsAt || existingTrial.status !== 'ACTIVE') {
        console.log('Trial expired/cancelled, blocking reactivation...');
        return NextResponse.json({
          success: false,
          error: 'TRIAL_ALREADY_USED',
          message: 'You have already used your one-time free trial offer. Upgrade to Premium to continue enjoying all features!',
          trialStatus: {
            active: false,
            used: true,
            usedAt: existingTrial.startDate.toISOString(),
            expiredAt: trialEndsAt.toISOString(),
          }
        }, { status: 400 });
      }
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

    console.log('Updating user preferences...');
    await db.user.update({
      where: { id: payload.userId },
      data: {
        virtualCapital: capital || 100000,
        notifSettings: mergedPrefs,
      },
    });
    console.log('User updated successfully');

    /* ---- Activate free trial (PREMIUM for 30 days) ---- */
    console.log('Activating new trial subscription...');

    // Double-check no trial exists (race condition protection)
    const retryCheck = await db.subscription.findFirst({
      where: { userId: payload.userId, razorpaySubId: 'TRIAL' },
    });

    if (retryCheck) {
      return NextResponse.json({
        success: false,
        error: 'TRIAL_ALREADY_USED',
        message: 'Free trial already activated for your account.',
      }, { status: 400 });
    }

    // Check if user already has a paid PREMIUM subscription
    const paidSub = await db.subscription.findFirst({
      where: { userId: payload.userId, status: 'ACTIVE', plan: 'PREMIUM', NOT: { razorpaySubId: 'TRIAL' } },
    });

    if (paidSub) {
      console.log('User already has paid PREMIUM, skipping trial creation');
      // Still save preferences and update portfolio
    } else {
      console.log('Creating new trial subscription...');
      const now = new Date();
      const endDate = new Date(now.getTime() + TRIAL_DURATION_MS);

      try {
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
        console.log('Trial subscription created successfully');

        // Upgrade tier to PREMIUM
        console.log('Upgrading user tier to PREMIUM...');
        await db.user.update({
          where: { id: payload.userId },
          data: { tier: 'PREMIUM' },
        });
        console.log('User tier upgraded to PREMIUM');
      } catch (createError: unknown) {
        const errMsg = createError instanceof Error ? createError.message : '';
        console.error('Create trial error:', errMsg);
        
        if (errMsg.includes('Unique constraint') || errMsg.includes('unique constraint')) {
          return NextResponse.json({
            success: false,
            error: 'TRIAL_ALREADY_USED',
            message: 'Free trial already activated for your account.',
          }, { status: 400 });
        }
        throw createError;
      }
    }

    /* ---- Update portfolio balance ---- */
    const chosenCapital = capital || 100000;
    console.log('Updating portfolio with capital:', chosenCapital);
    
    const portfolio = await db.portfolio.findUnique({ where: { userId: payload.userId } });
    console.log('Portfolio found:', portfolio ? portfolio.id : 'NOT FOUND');

    if (portfolio) {
      const prevBalance = Number(portfolio.totalBalance);
      const uplift = chosenCapital - prevBalance;
      console.log('Portfolio update - prevBalance:', prevBalance, 'uplift:', uplift);

      await db.portfolio.update({
        where: { userId: payload.userId },
        data: {
          totalBalance: chosenCapital,
          availableMargin: { increment: Math.max(0, uplift) },
        },
      });
      console.log('Portfolio updated');

      // Record transaction only if balance increased
      if (uplift > 0) {
        console.log('Creating credit transaction...');
        const updated = await db.portfolio.findUnique({ where: { userId: payload.userId } });
        try {
          await db.transaction.create({
            data: {
              portfolioId: portfolio.id,
              type: 'CREDIT',
              amount: uplift,
              balance: Number(updated?.totalBalance ?? chosenCapital),
              description: `Free trial activated — Virtual capital set to ₹${chosenCapital.toLocaleString('en-IN')}`,
            },
          });
          console.log('Transaction created');
        } catch (txError) {
          console.warn('Transaction creation failed (non-critical):', txError);
        }
      }
    } else {
      console.log('Creating new portfolio...');
      try {
        const newPortfolio = await db.portfolio.create({
          data: {
            userId: payload.userId,
            totalBalance: chosenCapital,
            availableMargin: chosenCapital,
          },
        });
        console.log('New portfolio created:', newPortfolio.id);
        
        try {
          await db.transaction.create({
            data: {
              portfolioId: newPortfolio.id,
              type: 'CREDIT',
              amount: chosenCapital,
              balance: chosenCapital,
              description: `Free trial activated — Initial virtual capital ₹${chosenCapital.toLocaleString('en-IN')}`,
            },
          });
          console.log('Initial transaction created');
        } catch (txError) {
          console.warn('Initial transaction creation failed (non-critical):', txError);
        }
      } catch (portfolioError) {
        console.error('Failed to create portfolio:', portfolioError);
        throw portfolioError;
      }
    }

    /* ---- Add selected markets to watchlist ---- */
    if (markets && Array.isArray(markets)) {
      console.log('Adding markets to watchlist:', markets);
      for (const market of markets) {
        const symbolMap: Record<string, string> = {
          stocks: 'NIFTY 50',
          options: 'NIFTY 50',
          futures: 'NIFTY 50',
        };
        const symbol = symbolMap[market] || 'NIFTY 50';
        try {
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
        } catch (watchlistError) {
          console.warn(`Failed to add ${market} to watchlist:`, watchlistError);
        }
      }
    }

    console.log('Onboarding completed successfully!');
    return NextResponse.json({
      success: true,
      message: 'Free trial activated successfully',
      trialActivated: true,
    });
  } catch (error) {
    console.error('Onboarding activation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to activate trial',
      details: errorMessage,
    }, { status: 500 });
  }
}
