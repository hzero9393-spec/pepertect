import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

// 30 days in milliseconds
const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Plan details
const TRIAL_PLAN = 'PREMIUM';
const TRIAL_PLAN_PRICE = 299;

interface TrialStatus {
  eligible: boolean;
  active: boolean;
  expired: boolean;
  daysLeft: number;
  hoursLeft: number;
  startedAt: string | null;
  endsAt: string | null;
  plan: string;
  planPrice: number;
  durationDays: number;
  message: string;
  trialUsed?: boolean;
  onboardingCompleted?: boolean; // NEW: for frontend blocking
}

/**
 * GET /api/user/trial-status
 * 
 * Returns comprehensive trial status including:
 * - Whether user is ELIGIBLE (never used trial)
 * - Whether trial is ACTIVE (with countdown)
 * - Whether trial is EXPIRED/USED
 * - Whether ONBOARDING is completed (for popup/redirect logic)
 */
async function computeTrialStatus(userId: string): Promise<TrialStatus> {
  // ========== GET USER WITH ALL FIELDS ==========
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tier: true,
      onboardingCompleted: true,
      onboardingCompletedAt: true,
      trialActivatedAt: true,
      subscriptions: {
        where: { razorpaySubId: 'TRIAL' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!user) {
    return {
      eligible: false,
      active: false,
      expired: false,
      daysLeft: 0,
      hoursLeft: 0,
      startedAt: null,
      endsAt: null,
      plan: TRIAL_PLAN,
      planPrice: TRIAL_PLAN_PRICE,
      durationDays: 30,
      message: 'User not found.',
    };
  }

  // ========== CHECK 1: Paid PREMIUM (non-trial) ==========
  const paidSub = await db.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      plan: 'PREMIUM',
      NOT: { razorpaySubId: 'TRIAL' },
    },
  });
  
  if (paidSub) {
    return {
      eligible: false,
      active: false,
      expired: false,
      daysLeft: 0,
      hoursLeft: 0,
      startedAt: null,
      endsAt: null,
      plan: TRIAL_PLAN,
      planPrice: TRIAL_PLAN_PRICE,
      durationDays: 30,
      message: 'You already have an active PREMIUM plan.',
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  // ========== CHECK 2: Trial Subscription ==========
  const existingTrial = user.subscriptions[0]; // Most recent trial
  
  if (!existingTrial) {
    // No trial exists - USER IS ELIGIBLE!
    const isEligible = !user.onboardingCompleted || user.trialActivatedAt === null;
    
    return {
      eligible: isEligible,
      active: false,
      expired: false,
      daysLeft: 30,
      hoursLeft: 0,
      startedAt: null,
      endsAt: null,
      plan: TRIAL_PLAN,
      planPrice: TRIAL_PLAN_PRICE,
      durationDays: 30,
      message: isEligible 
        ? 'Start your 30-day free PREMIUM trial today.' 
        : 'Complete your onboarding to activate free trial.',
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  // ========== CALCULATE TRIAL STATUS ==========
  const startedAt = existingTrial.startDate.getTime();
  const endsAt = startedAt + TRIAL_DURATION_MS;
  const now = Date.now();

  if (now > endsAt) {
    // TRIAL EXPIRED
    return {
      eligible: false,
      active: false,
      expired: true,
      trialUsed: true,
      daysLeft: 0,
      hoursLeft: 0,
      startedAt: existingTrial.startDate.toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      plan: TRIAL_PLAN,
      planPrice: TRIAL_PLAN_PRICE,
      durationDays: 30,
      message: 'Your free trial has ended. Upgrade to PREMIUM to continue!',
      onboardingCompleted: user.onboardingCompleted,
    };
  }

  // ========== TRIAL ACTIVE ==========
  const msLeft = endsAt - now;
  const daysLeft = Math.floor(msLeft / (24 * 60 * 60 * 1000));
  const hoursLeft = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  return {
    eligible: false,
    active: true,
    expired: false,
    daysLeft,
    hoursLeft,
    startedAt: existingTrial.startDate.toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    plan: TRIAL_PLAN,
    planPrice: TRIAL_PLAN_PRICE,
    durationDays: 30,
    message: `${daysLeft} days ${hoursLeft} hours left in your free trial.`,
    onboardingCompleted: user.onboardingCompleted,
  };
}

/**
 * GET - Fetch current trial status
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const status = await computeTrialStatus(auth.userId);
    console.log('[trial-status] GET response:', { 
      userId: auth.userId, 
      eligible: status.eligible, 
      active: status.active,
      onboardingCompleted: status.onboardingCompleted 
    });
    
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('[trial-status] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trial status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Start free trial directly (without full onboarding)
 * Body: { action: 'start' }
 * 
 * NOTE: This is an alternative activation method.
 * The primary method is through /api/onboarding/complete
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    let action = 'start';
    try {
      const body = await req.json();
      if (body?.action) action = body.action;
    } catch { /* empty body */ }

    if (action !== 'start') {
      return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
    }

    // Check for paid PREMIUM first
    const paidSub = await db.subscription.findFirst({
      where: { 
        userId: auth.userId, 
        status: 'ACTIVE', 
        plan: 'PREMIUM',
        NOT: { razorpaySubId: 'TRIAL' },
      },
    });
    if (paidSub) {
      return NextResponse.json({
        success: false, error: 'ALREADY_PREMIUM',
        message: 'You already have an active PREMIUM subscription.',
      }, { status: 400 });
    }

    // Check for existing trial
    const existingTrial = await db.subscription.findFirst({
      where: { userId: auth.userId, razorpaySubId: 'TRIAL' },
      orderBy: { createdAt: 'desc' },
    });

    if (existingTrial) {
      const status = await computeTrialStatus(auth.userId);
      
      if (status.active) {
        return NextResponse.json({
          success: false, error: 'TRIAL_ACTIVE',
          message: `Your trial is already active! ${status.daysLeft} days remaining.`,
          data: status,
        }, { status: 400 });
      }
      
      if (status.expired) {
        return NextResponse.json({
          success: false, error: 'TRIAL_ALREADY_USED',
          message: 'You have already used your free trial. Upgrade to Premium!',
          data: status,
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false, error: 'TRIAL_USED',
        message: 'You have already used your free trial.',
        data: status,
      }, { status: 400 });
    }

    // ========== CREATE NEW TRIAL ==========
    const now = new Date();
    const endDate = new Date(now.getTime() + TRIAL_DURATION_MS);
    const INITIAL_CAPITAL = 100000;

    // Create subscription
    await db.subscription.create({
      data: {
        userId: auth.userId,
        plan: TRIAL_PLAN,
        status: 'ACTIVE',
        startDate: now,
        endDate,
        autoRenew: false,
        razorpaySubId: 'TRIAL',
      },
    });

    // Update user
    await db.user.update({
      where: { id: auth.userId },
      data: { 
        tier: 'PREMIUM',
        virtualCapital: INITIAL_CAPITAL,
        trialActivatedAt: now,
        onboardingCompleted: true,
        onboardingCompletedAt: now,
      },
    });

    // Credit portfolio
    try {
      const portfolio = await db.portfolio.findUnique({ where: { userId: auth.userId }});
      if (portfolio) {
        const prevBalance = Number(portfolio.totalBalance);
        const uplift = INITIAL_CAPITAL - prevBalance;
        
        await db.portfolio.update({
          where: { userId: auth.userId },
          data: {
            totalBalance: INITIAL_CAPITAL,
            availableMargin: { increment: Math.max(0, uplift) },
          },
        });
        
        if (uplift > 0) {
          const updated = await db.portfolio.findUnique({ where: { userId: auth.userId }});
          await db.transaction.create({
            data: {
              portfolioId: portfolio.id,
              type: 'CREDIT',
              amount: uplift,
              balance: Number(updated?.totalBalance ?? INITIAL_CAPITAL),
              description: `Free trial activated — Virtual capital credited`,
            },
          }).catch(() => {});
        }
      } else {
        const newPortfolio = await db.portfolio.create({
          data: { userId: auth.userId, totalBalance: INITIAL_CAPITAL, availableMargin: INITIAL_CAPITAL },
        });
        await db.transaction.create({
          data: {
            portfolioId: newPortfolio.id,
            type: 'CREDIT',
            amount: INITIAL_CAPITAL,
            balance: INITIAL_CAPITAL,
            description: `Free trial activated — Initial virtual capital`,
          },
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Portfolio update failed (non-critical):', e);
    }

    const status = await computeTrialStatus(auth.userId);
    
    return NextResponse.json({
      success: true,
      data: status,
      message: '🎉 Free trial activated! ₹1,00,000 credited. Enjoy 30 days of PREMIUM!',
      virtualCapitalCredited: INITIAL_CAPITAL,
    });
  } catch (error) {
    console.error('[trial-status] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start trial', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
