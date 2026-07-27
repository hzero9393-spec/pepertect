import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MAX_OTP_ATTEMPTS = 5;

/**
 * POST /api/auth/verify-otp
 * Body: { email: string, otp: string }
 *
 * Verifies the OTP stored in PlatformSetting.
 * Returns a verification token that must be passed during registration.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp || typeof otp !== 'string') {
      return NextResponse.json({ success: false, error: 'Email and OTP are required' }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    const key = `otp:${normalized}`;

    const record = await db.platformSetting.findUnique({ where: { key } });

    if (!record) {
      return NextResponse.json({ success: false, error: 'No OTP found. Please request a new one.' }, { status: 400 });
    }

    const data = JSON.parse(record.value);

    // Check expiry
    if (new Date(data.expiresAt).getTime() < Date.now()) {
      await db.platformSetting.delete({ where: { key } });
      return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Check attempts
    if (data.attempts >= MAX_OTP_ATTEMPTS) {
      await db.platformSetting.delete({ where: { key } });
      return NextResponse.json({ success: false, error: 'Too many failed attempts. Please request a new OTP.' }, { status: 429 });
    }

    // Verify OTP
    if (data.otp !== otp.trim()) {
      // Increment attempt count
      data.attempts++;
      await db.platformSetting.update({
        where: { key },
        data: { value: JSON.stringify(data) },
      });
      const remaining = MAX_OTP_ATTEMPTS - data.attempts;
      return NextResponse.json({
        success: false,
        error: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      }, { status: 401 });
    }

    // OTP verified — generate a verification token
    const verifyToken = `verified_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Store verification token with expiry (30 min — enough to complete registration)
    await db.platformSetting.upsert({
      where: { key: `email_verified:${normalized}` },
      create: {
        key: `email_verified:${normalized}`,
        value: JSON.stringify({ token: verifyToken, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() }),
      },
      update: {
        value: JSON.stringify({ token: verifyToken, expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() }),
      },
    });

    // Delete the OTP record (used)
    await db.platformSetting.delete({ where: { key } });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      verifyToken,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify OTP' }, { status: 500 });
  }
}
