import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/auth/check-device
 * Body: { fingerprint: string }
 *
 * Checks if this device fingerprint has already been used for a free trial.
 * Returns: { trialUsed: boolean, message: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { fingerprint } = await req.json();

    if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length < 10) {
      return NextResponse.json({ success: false, error: 'Invalid device fingerprint' }, { status: 400 });
    }

    const key = `device_trial:${fingerprint}`;
    const record = await db.platformSetting.findUnique({ where: { key } });

    if (record) {
      const data = JSON.parse(record.value);
      if (data.used) {
        return NextResponse.json({
          success: true,
          trialUsed: true,
          message: 'This device has already used a free trial. Please upgrade to Premium.',
        });
      }
    }

    return NextResponse.json({
      success: true,
      trialUsed: false,
      message: 'Device is eligible for free trial',
    });
  } catch (error) {
    console.error('Check device error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check device' }, { status: 500 });
  }
}
