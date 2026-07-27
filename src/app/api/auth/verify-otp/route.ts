import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/auth/verify-otp
 * Body: { email: string, otp: string }
 *
 * Verifies OTP via Supabase Auth /auth/v1/verify endpoint.
 * If valid, generates a verifyToken for our registration flow.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp || typeof otp !== 'string') {
      return NextResponse.json({ success: false, error: 'Email and OTP are required' }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    const otpClean = otp.trim();

    if (otpClean.length < 4) {
      return NextResponse.json({ success: false, error: 'OTP must be at least 4 digits' }, { status: 400 });
    }

    // ── Verify OTP via Supabase /auth/v1/verify ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Email service not configured' }, { status: 500 });
    }

    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        type: 'email',
        email: normalized,
        token: otpClean,
      }),
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.json().catch(() => ({}));
      console.error(`[VERIFY-OTP] Supabase verify failed for ${normalized}:`, errData);

      if (errData?.error_code === 'token_not_found' || errData?.error_code === 'otp_expired') {
        return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
      }

      if (errData?.error_code === 'token_already_verified') {
        // OTP was already verified — this is actually OK, proceed
        console.log(`[VERIFY-OTP] Token already verified for ${normalized}, allowing through`);
      } else {
        return NextResponse.json({ success: false, error: 'Invalid OTP. Please check and try again.' }, { status: 401 });
      }
    }

    // OTP verified via Supabase — generate our verifyToken for registration
    const verifyToken = `verified_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Store verification token (30 min expiry — enough to complete registration)
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

    console.log(`[VERIFY-OTP] Success for ${normalized}`);

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
