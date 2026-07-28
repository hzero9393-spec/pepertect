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
    // CHECK: Has this user completed onboarding BEFORE?
    // ============================================
    const prefs = user.notifSettings as Record<string, unknown> | null;
    const alreadyCompletedOnboarding = prefs?.onboardingCompleted === true;
    
    console.log('Already completed onboarding?', alreadyCompletedOnboarding);

    // ============================================
    // PRE-CHECK: Has this user already used FREE TRIAL?
    // KEY LOGIC:
    // - If user NEVER completed onboarding → They are NEW, always allow trial
    // - If user ALREADY completed onboarding + has expired trial → Block them
    // - If user has ACTIVE trial → Just update preferences, don't create new one
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
      
      const now = new Date();
      const trialEndsAt = new Date(existingTrial.startDate.getTime() + TRIAL_DURATION_MS);
      
      // Case 1: Trial is STILL ACTIVE → Update preferences, return success
      if (existingTrial.status === 'ACTIVE' && now < trialEndsAt) {
        console.log('Trial still active, updating preferences only...');
        await updateUserPreferences(payload.userId, user, { experience, goal, capital, markets });

        return NextResponse.json({
          success: true,
          message: 'Preferences updated! Your trial is already active.',
          trialActivated: false,
          trialStatus: {
            active: true,
            endsAt: trialEndsAt.toISOString(),
            daysLeft: Math.floor((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
          }
        });
      }
      
      // Case 2: Trial EXISTS but user NEVER completed onboarding → NEW USER who somehow got a trial
      // (Maybe via /free-trial page) → DELETE old trial and create FRESH one
      if (!alreadyCompletedOnboarding) {
        console.log('🔄 New user (onboarding not complete) with stale trial record. Deleting old trial and creating fresh one...');
        
        try {
          // Delete the existing trial record
          await db.subscription.delete({
            where: { id: existingTrial.id }
          });
          console.log('Old trial record deleted successfully');
        } catch (deleteError) {
          console.error('Failed to delete old trial:', deleteError);
          // Continue anyway, try to create new one
        }
        
        // DON'T return here, continue to create fresh trial below
      }
      else {
        // Case 3: User COMPLETED onboarding before AND trial is expired/cancelled → GENUINELY USED
        console.log('❌ Returning user with expired/cancelled trial. Blocking...');
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
    console.log('Updating user preferences...');
    await updateUserPreferences(payload.userId, user, { experience, goal, capital, markets });
    console.log('User updated successfully');

    /* ---- Activate free trial (PREMIUM for 30 days) ---- */
    console.log('Activating new trial subscription...');

    // Double-check no trial exists (race condition protection)
    const retryCheck = await db.subscription.findFirst({
      where: { userId: payload.userId, razorpaySubId: 'TRIAL' },
    });

    if (retryCheck) {
      // If trial was created by another request, just return success
      console.log('Trial was created concurrently, returning success');
      return NextResponse.json({
        success: true,
        message: 'Free trial activated successfully',
        trialActivated: true,
      });
    }

    // Check if user already has a paid PREMIUM subscription
    const paidSub = await db.subscription.findFirst({
      where: { userId: payload.userId, status: 'ACTIVE', plan: 'PREMIUM', NOT: { razorpaySubId: 'TRIAL' } },
    });

    if (paidSub) {
      console.log('User already has paid PREMIUM, skipping trial creation');
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
          // Trial was created concurrently, that's fine
          return NextResponse.json({
            success: true,
            message: 'Free trial activated successfully',
            trialActivated: true,
          });
        }
        throw createError;
      }
    }

    /* ---- Update portfolio balance ---- */
    const chosenCapital = capital || 100000;
    console.log('Updating portfolio with capital:', chosenCapital);
    
    await updatePortfolio(payload.userId, chosenCapital);

    /* ---- Add selected markets to watchlist ---- */
    if (markets && Array.isArray(markets)) {
      console.log('Adding markets to watchlist:', markets);
      await addMarketsToWatchlist(payload.userId, markets);
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

/* ========== HELPER FUNCTIONS ========== */

async function updateUserPreferences(
  userId: string,
  user: { notifSettings: unknown },
  data: { experience: string; goal: string; capital?: number; markets?: string[] }
) {
  const { experience, goal, capital, markets } = data;
  
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
    where: { id: userId },
    data: {
      virtualCapital: capital || 100000,
      notifSettings: mergedPrefs,
    },
  });
}

async function updatePortfolio(userId: string, chosenCapital: number) {
  const portfolio = await db.portfolio.findUnique({ where: { userId }});
  console.log('Portfolio found:', portfolio ? portfolio.id : 'NOT FOUND');

  if (portfolio) {
    const prevBalance = Number(portfolio.totalBalance);
    const uplift = chosenCapital - prevBalance;
    console.log('Portfolio update - prevBalance:', prevBalance, 'uplift:', uplift);

    await db.portfolio.update({
      where: { userId },
      data: {
        totalBalance: chosenCapital,
        availableMargin: { increment: Math.max(0, uplift) },
      },
    });

    // Record transaction only if balance increased
    if (uplift > 0) {
      const updated = await db.portfolio.findUnique({ where: { userId }});
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
      } catch (txError) {
        console.warn('Transaction creation failed (non-critical):', txError);
      }
    }
  } else {
    console.log('Creating new portfolio...');
    try {
      const newPortfolio = await db.portfolio.create({
        data: {
          userId,
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
      } catch (txError) {
        console.warn('Initial transaction creation failed (non-critical):', txError);
      }
    } catch (portfolioError) {
      console.error('Failed to create portfolio:', portfolioError);
      throw portfolioError;
    }
  }
}

async function addMarketsToWatchlist(userId: string, markets: string[]) {
  const symbolMap: Record<string, string> = {
    stocks: 'NIFTY 50',
    options: 'NIFTY 50',
    futures: 'NIFTY 50',
  };

  for (const market of markets) {
    const symbol = symbolMap[market] || 'NIFTY 50';
    try {
      const marketStock = await db.stock.findFirst({ where: { symbol } });
      if (marketStock) {
        const existing = await db.watchlist.findUnique({
          where: { userId_stockId: { userId, stockId: marketStock.id } },
        });
        if (!existing) {
          await db.watchlist.create({
            data: { userId, stockId: marketStock.id },
          });
        }
      }
    } catch (watchlistError) {
      console.warn(`Failed to add ${market} to watchlist:`, watchlistError);
    }
  }
}
