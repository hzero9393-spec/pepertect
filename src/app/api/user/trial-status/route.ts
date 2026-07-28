import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

// 30 days in milliseconds
const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Plan that becomes available during the trial (₹299 PREMIUM)
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
}

/**
 * Compute trial status for a user.
 * - If they already have a PREMIUM subscription (paid), they are not eligible.
 * - If they have never started a trial, eligible=true and we DO NOT start it
 *   until they explicitly opt in (POST /api/user/trial-status).
 * - If they have an active trial, return days/hours remaining.
 * - If their trial ended, expired=true; they cannot restart.
 */
async function computeTrialStatus(userId: string): Promise<TrialStatus> {
  // 1) Check for any paid/active PREMIUM subscription
  const paidSub = await db.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      plan: 'PREMIUM',
    },
    orderBy: { createdAt: 'desc' },
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
    };
  }

  // 2) Look for an existing trial subscription (we tag it via razorpaySubId='TRIAL')
  const existingTrial = await db.subscription.findFirst({
    where: {
      userId,
      razorpaySubId: 'TRIAL',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!existingTrial) {
    return {
      eligible: true,
      active: false,
      expired: false,
      daysLeft: 30,
      hoursLeft: 0,
      startedAt: null,
      endsAt: null,
      plan: TRIAL_PLAN,
      planPrice: TRIAL_PLAN_PRICE,
      durationDays: 30,
      message: 'Start your 30-day free PREMIUM trial today.',
    };
  }

  const startedAt = existingTrial.startDate.getTime();
  const endsAt = startedAt + TRIAL_DURATION_MS;
  const now = Date.now();

  if (now > endsAt) {
    return {
      eligible: false,
      active: false,
      expired: true,
      trialUsed: true, // Mark that trial was used before
      daysLeft: 0,
      hoursLeft: 0,
      startedAt: existingTrial.startDate.toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      plan: TRIAL_PLAN,
      planPrice: TRIAL_PLAN_PRICE,
      durationDays: 30,
      message: 'You have already used your free trial. Upgrade to PREMIUM to continue.',
    };
  }

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
  };
}

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const status = await computeTrialStatus(auth.userId);
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('Trial status fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trial status' },
      { status: 500 }
    );
  }
}

/**
 * POST — start the free trial now.
 * Body: { action: 'start' }  (default if no body)
 * Idempotent: if a trial is already active, returns its current status.
 * 
 * IMPORTANT: This endpoint also:
 * 1. Sets virtualCapital to ₹1,00,000 on the user
 * 2. Creates/updates portfolio with ₹1,00,000 balance
 * 3. Creates transaction record for the credit
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    let action = 'start';
    try {
      const body = await req.json();
      if (body && body.action) action = body.action;
    } catch {
      // Body may be empty — default to 'start'
    }

    if (action !== 'start') {
      return NextResponse.json(
        { success: false, error: 'Unsupported action' },
        { status: 400 }
      );
    }

    // Check if user already has a paid PREMIUM plan (non-trial)
    const paidSub = await db.subscription.findFirst({
      where: { 
        userId: auth.userId, 
        status: 'ACTIVE', 
        plan: 'PREMIUM',
        NOT: { razorpaySubId: 'TRIAL' }  // Exclude trial subscriptions
      },
    });
    if (paidSub) {
      return NextResponse.json({
        success: false,
        error: 'ALREADY_PREMIUM',
        message: 'You already have an active PREMIUM subscription.',
      }, { status: 400 });
    }

    // Check for existing trial (active or expired)
    const existingTrial = await db.subscription.findFirst({
      where: { userId: auth.userId, razorpaySubId: 'TRIAL' },
      orderBy: { createdAt: 'desc' },
    });

    if (existingTrial) {
      // Trial already started — check its status
      const status = await computeTrialStatus(auth.userId);
      
      if (status.active) {
        // Trial is STILL ACTIVE - don't allow re-activation
        return NextResponse.json({
          success: false,
          error: 'TRIAL_ACTIVE',
          message: 'Your free trial is already active! You have ' + status.daysLeft + ' days remaining.',
          data: status,
        }, { status: 400 });
      } else if (status.expired) {
        // Trial was used before and has expired - BLOCK re-activation
        return NextResponse.json({
          success: false,
          error: 'TRIAL_ALREADY_USED',
          message: 'You have already used your one-time free trial. Upgrade to Premium to continue!',
          data: status,
        }, { status: 400 });
      }
      
      // Fallback for edge cases
      return NextResponse.json({
        success: false,
        error: 'TRIAL_USED',
        message: 'You have already used your free trial offer.',
        data: status,
      }, { status: 400 });
    }

    // ============================================
    // START FRESH TRIAL - Complete Setup
    // ============================================
    
    const now = new Date();
    const endDate = new Date(now.getTime() + TRIAL_DURATION_MS);
    const INITIAL_CAPITAL = 100000; // ₹1 Lakh

    // 1. Create trial subscription
    console.log('Creating trial subscription for user:', auth.userId);
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
    console.log('Trial subscription created');

    // 2. Upgrade user tier to PREMIUM
    await db.user.update({
      where: { id: auth.userId },
      data: { 
        tier: 'PREMIUM',
        virtualCapital: INITIAL_CAPITAL,  // Set virtual capital to ₹1 Lakh
      },
    });
    console.log('User tier upgraded to PREMIUM, virtualCapital set to', INITIAL_CAPITAL);

    // 3. Create or update portfolio with ₹1 Lakh balance
    try {
      const existingPortfolio = await db.portfolio.findUnique({
        where: { userId: auth.userId },
      });
      
      if (existingPortfolio) {
        // Update existing portfolio
        const prevBalance = Number(existingPortfolio.totalBalance);
        const uplift = INITIAL_CAPITAL - prevBalance;
        
        await db.portfolio.update({
          where: { userId: auth.userId },
          data: {
            totalBalance: INITIAL_CAPITAL,
            availableMargin: { increment: Math.max(0, uplift) },
          },
        });
        console.log('Portfolio updated, balance:', INITIAL_CAPITAL);
        
        // Record transaction only if balance increased
        if (uplift > 0) {
          const updatedPortfolio = await db.portfolio.findUnique({ where: { userId: auth.userId } });
          try {
            await db.transaction.create({
              data: {
                portfolioId: existingPortfolio.id,
                type: 'CREDIT',
                amount: uplift,
                balance: Number(updatedPortfolio?.totalBalance ?? INITIAL_CAPITAL),
                description: `Free trial activated — Virtual capital credited: ₹${INITIAL_CAPITAL.toLocaleString('en-IN')}`,
              },
            });
            console.log('Transaction recorded for portfolio uplift');
          } catch (txError) {
            console.warn('Transaction creation failed (non-critical):', txError);
          }
        }
      } else {
        // Create new portfolio
        const newPortfolio = await db.portfolio.create({
          data: {
            userId: auth.userId,
            totalBalance: INITIAL_CAPITAL,
            availableMargin: INITIAL_CAPITAL,
          },
        });
        console.log('New portfolio created with balance:', INITIAL_CAPITAL);
        
        // Record initial transaction
        try {
          await db.transaction.create({
            data: {
              portfolioId: newPortfolio.id,
              type: 'CREDIT',
              amount: INITIAL_CAPITAL,
              balance: INITIAL_CAPITAL,
              description: `Free trial activated — Initial virtual capital: ₹${INITIAL_CAPITAL.toLocaleString('en-IN')}`,
            },
          });
          console.log('Initial transaction recorded');
        } catch (txError) {
          console.warn('Initial transaction creation failed (non-critical):', txError);
        }
      }
    } catch (portfolioError) {
      console.error('Portfolio update error (non-critical):', portfolioError);
      // Don't fail the trial activation if portfolio update fails
    }

    const status = await computeTrialStatus(auth.userId);
    console.log('Trial activated successfully for user:', auth.userId);
    
    return NextResponse.json({
      success: true,
      data: status,
      message: '🎉 Free trial activated! You received ₹1,00,000 virtual capital. Enjoy PREMIUM features for 30 days!',
      virtualCapitalCredited: INITIAL_CAPITAL,
    });
  } catch (error) {
    console.error('Trial start error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start trial', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
