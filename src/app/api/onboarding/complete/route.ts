import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const INITIAL_CAPITAL = 100000; // ₹1 Lakh - FIXED for all users

/**
 * POST /api/onboarding/complete
 * 
 * CRITICAL: This is the ONLY endpoint that:
 * 1. Marks onboarding as complete (blocks re-entry)
 * 2. Activates free trial
 * 3. Credits ₹1,00,000 virtual capital
 * 
 * SECURITY: Can only run ONCE per user lifetime!
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { experience, goal, capital, markets } = body;

    console.log('🚀 Onboarding request received:', { experience, goal, capital, markets });

    // ========== AUTHENTICATION ==========
    const authHeader = req.headers.get('authorization');
    const token = authHeader ? extractBearerToken(authHeader) : null;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // ========== GET USER ==========
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    console.log('👤 User found:', user.id, 'email:', user.email);

    // ========== CHECK 1: Onboarding Already Completed? ==========
    // Check DEDICATED field first (new schema)
    if (user.onboardingCompleted === true) {
      console.log('❌ Onboarding ALREADY COMPLETED (dedicated field) - Blocking!');
      return NextResponse.json({
        success: false,
        error: 'ONBOARDING_ALREADY_COMPLETED',
        message: 'You have already completed onboarding! Your free trial is active.',
        alreadyCompleted: true,
        // Return current trial status so frontend can redirect appropriately
        trialStatus: await getTrialStatus(payload.userId),
      }, { status: 400 });
    }

    // Fallback: Check JSON field (for users before migration)
    const prefs = user.notifSettings as Record<string, unknown> | null;
    if (prefs?.onboardingCompleted === true) {
      console.log('❌ Onboarding ALREADY COMPLETED (JSON field) - Blocking! Migrating to dedicated field...');
      
      // Migrate to dedicated field
      try {
        await db.user.update({
          where: { id: payload.userId },
          data: { 
            onboardingCompleted: true,
            onboardingCompletedAt: new Date(prefs.onboardingCompletedAt as string || Date.now()),
          },
        });
      } catch (e) {
        console.warn('Migration failed:', e);
      }
      
      return NextResponse.json({
        success: false,
        error: 'ONBOARDING_ALREADY_COMPLETED',
        message: 'You have already completed onboarding!',
        alreadyCompleted: true,
      }, { status: 400 });
    }

    // ========== CHECK 2: Trial Already Used? ==========
    const existingTrial = await db.subscription.findFirst({
      where: { 
        userId: payload.userId,
        razorpaySubId: 'TRIAL'
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingTrial) {
      console.log('⚠️ Existing trial found:', existingTrial.id);
      
      const now = new Date();
      const trialEndsAt = new Date(existingTrial.startDate.getTime() + TRIAL_DURATION_MS);
      
      // Trial is still ACTIVE - just update preferences and return
      if (existingTrial.status === 'ACTIVE' && now < trialEndsAt) {
        console.log('✅ Trial still active - updating preferences + marking onboarding complete');
        
        await markOnboardingComplete(payload.userId, { experience, goal, capital, markets });
        
        return NextResponse.json({
          success: true,
          message: 'Onboarding complete! Your trial is already active.',
          trialActivated: false, // Not a NEW activation
          trialStatus: {
            active: true,
            endsAt: trialEndsAt.toISOString(),
            daysLeft: Math.floor((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
          }
        });
      }
      
      // Trial EXISTS but EXPIRED - don't allow new one
      console.log('❌ Trial expired/cancelled - cannot reactivate');
      return NextResponse.json({
        success: false,
        error: 'TRIAL_ALREADY_USED',
        message: 'You have already used your free trial offer.',
        trialStatus: {
          active: false,
          used: true,
          expiredAt: trialEndsAt.toISOString(),
        }
      }, { status: 400 });
    }

    // ========== ALL CHECKS PASSED - ACTIVATE TRIAL ==========
    console.log('✅ All checks passed - ACTIVATING FREE TRIAL!');
    
    const now = new Date();
    const endDate = new Date(now.getTime() + TRIAL_DURATION_MS);

    // Step 1: Mark Onboarding Complete (BEFORE anything else)
    await markOnboardingComplete(payload.userId, { experience, goal, capital, markets });

    // Step 2: Create Trial Subscription
    console.log('Creating trial subscription...');
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

    // Step 3: Update User Tier + Capital + Trial Timestamp
    console.log('Updating user tier to PREMIUM...');
    await db.user.update({
      where: { id: payload.userId },
      data: { 
        tier: 'PREMIUM',
        virtualCapital: INITIAL_CAPITAL,
        trialActivatedAt: now, // For timer calculation
      },
    });

    // Step 4: Credit Portfolio with ₹1,00,000
    console.log('Crediting portfolio with ₹', INITIAL_CAPITAL.toLocaleString('en-IN'));
    await creditPortfolio(payload.userId, INITIAL_CAPITAL);

    // Step 5: Add selected markets to watchlist
    if (markets && Array.isArray(markets)) {
      await addMarketsToWatchlist(payload.userId, markets);
    }

    console.log('🎉 ONBOARDING COMPLETE - Trial activated successfully!');
    
    return NextResponse.json({
      success: true,
      message: '🎉 Free trial activated! You received ₹1,00,000 virtual capital.',
      trialActivated: true,
      virtualCapitalCredited: INITIAL_CAPITAL,
      trialEndsAt: endDate.toISOString(),
      trialDurationDays: 30,
    });

  } catch (error) {
    console.error('💥 Onboarding error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to activate trial',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/* ================================================================
   HELPER FUNCTIONS
   ================================================================ */

/**
 * Mark onboarding as COMPLETE - sets both dedicated field AND JSON field
 */
async function markOnboardingComplete(
  userId: string, 
  data: { experience: string; goal: string; capital?: number; markets?: string[] }
) {
  const { experience, goal, capital, markets } = data;
  const now = new Date();

  // Get existing prefs to merge
  const user = await db.user.findUnique({ where: { id: userId } });
  const existingPrefs = (user?.notifSettings as Record<string, unknown>) || {};

  const mergedPrefs = {
    ...existingPrefs,
    experience,
    goal,
    markets,
    onboardingCompleted: true,
    onboardingCompletedAt: now.toISOString(),
  };

  // Update BOTH dedicated fields AND JSON (for backward compatibility)
  await db.user.update({
    where: { id: userId },
    data: {
      // Dedicated fields (NEW - reliable)
      onboardingCompleted: true,
      onboardingCompletedAt: now,
      virtualCapital: capital || INITIAL_CAPITAL,
      // JSON field (OLD - for backward compat)
      notifSettings: mergedPrefs,
    },
  });

  console.log('✅ Onboarding marked as complete');
}

/**
 * Credit portfolio with initial capital
 */
async function creditPortfolio(userId: string, amount: number) {
  let portfolio = await db.portfolio.findUnique({ where: { userId }});

  if (portfolio) {
    // Update existing portfolio
    const prevBalance = Number(portfolio.totalBalance);
    const uplift = amount - prevBalance;
    
    await db.portfolio.update({
      where: { userId },
      data: {
        totalBalance: amount,
        availableMargin: { increment: Math.max(0, uplift) },
      },
    });

    // Record transaction if balance increased
    if (uplift > 0) {
      const updated = await db.portfolio.findUnique({ where: { userId }});
      try {
        await db.transaction.create({
          data: {
            portfolioId: portfolio.id,
            type: 'CREDIT',
            amount: uplift,
            balance: Number(updated?.totalBalance ?? amount),
            description: `Free trial activated — Virtual capital: ₹${amount.toLocaleString('en-IN')}`,
          },
        });
      } catch (txError) {
        console.warn('Transaction creation failed (non-critical):', txError);
      }
    }
  } else {
    // Create new portfolio
    portfolio = await db.portfolio.create({
      data: {
        userId,
        totalBalance: amount,
        availableMargin: amount,
      },
    });

    // Record initial transaction
    try {
      await db.transaction.create({
        data: {
          portfolioId: portfolio.id,
          type: 'CREDIT',
          amount,
          balance: amount,
          description: `Free trial activated — Initial virtual capital: ₹${amount.toLocaleString('en-IN')}`,
        },
      });
    } catch (txError) {
      console.warn('Initial transaction failed (non-critical):', txError);
    }
  }
}

/**
 * Add selected markets to watchlist
 */
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
    } catch (e) {
      console.warn(`Failed to add ${market} to watchlist:`, e);
    }
  }
}

/**
 * Get current trial status for a user
 */
async function getTrialStatus(userId: string) {
  const trial = await db.subscription.findFirst({
    where: { userId, razorpaySubId: 'TRIAL' },
    orderBy: { createdAt: 'desc' },
  });

  if (!trial) return null;

  const now = new Date();
  const endsAt = new Date(trial.startDate.getTime() + TRIAL_DURATION_MS);
  
  return {
    active: trial.status === 'ACTIVE' && now < endsAt,
    endsAt: endsAt.toISOString(),
    daysLeft: Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))),
  };
}
