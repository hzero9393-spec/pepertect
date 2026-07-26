import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
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
      daysLeft: 0,
      hoursLeft: 0,
      startedAt: existingTrial.startDate.toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      plan: TRIAL_PLAN,
      planPrice: TRIAL_PLAN_PRICE,
      durationDays: 30,
      message: 'Your free trial has ended. Upgrade to PREMIUM to continue.',
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
  const auth = await authenticateRequest(req);
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
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
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

    // Check if user already has a paid PREMIUM plan
    const paidSub = await db.subscription.findFirst({
      where: { userId: auth.userId, status: 'ACTIVE', plan: 'PREMIUM' },
    });
    if (paidSub) {
      return NextResponse.json({
        success: false,
        error: 'You already have an active PREMIUM subscription.',
      }, { status: 400 });
    }

    // Check for existing trial (active or expired)
    const existingTrial = await db.subscription.findFirst({
      where: { userId: auth.userId, razorpaySubId: 'TRIAL' },
      orderBy: { createdAt: 'desc' },
    });

    if (existingTrial) {
      // Trial already started — just return current status (don't restart)
      const status = await computeTrialStatus(auth.userId);
      return NextResponse.json({
        success: true,
        data: status,
        message: status.active
          ? 'Trial already active.'
          : 'Trial has already been used.',
      });
    }

    // Start a new trial subscription
    const now = new Date();
    const endDate = new Date(now.getTime() + TRIAL_DURATION_MS);

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

    // Upgrade the user's tier to PREMIUM so the rest of the app unlocks trial benefits
    await db.user.update({
      where: { id: auth.userId },
      data: { tier: 'PREMIUM' },
    });

    const status = await computeTrialStatus(auth.userId);
    return NextResponse.json({
      success: true,
      data: status,
      message: 'Free trial started! Enjoy PREMIUM features for 30 days.',
    });
  } catch (error) {
    console.error('Trial start error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start trial' },
      { status: 500 }
    );
  }
}
