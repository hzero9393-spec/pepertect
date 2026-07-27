import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MAX_OTP_ATTEMPTS = 5;

/**
 * POST /api/auth/verify-otp
 * Body: { email: string, otp: string }
 *
 * Verifies OTP via Supabase Auth API.
 * Falls back to local PlatformSetting verification if Supabase is not configured.
 * Returns a verification token for the registration step.
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    let otpVerified = false;

    // Check which method was used to send the OTP
    const methodRecord = await db.platformSetting.findUnique({ where: { key: `otp_method:${normalized}` } });
    const otpMethod = methodRecord?.value || (supabaseUrl ? 'supabase' : 'local');

    if (otpMethod === 'supabase' && supabaseUrl && supabaseKey) {
      // ── Verify via Supabase Auth ──
      try {
        const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({
            email: normalized,
            token: otpClean,
            type: 'email',
          }),
        });

        if (verifyRes.ok) {
          otpVerified = true;
        } else {
          const errData = await verifyRes.json().catch(() => ({}));
          const errorMsg = errData?.error_description || errData?.error || 'Invalid OTP';

          if (errorMsg.includes('expired') || errorMsg.includes('Expired')) {
            return NextResponse.json({
              success: false,
              error: 'OTP has expired. Please request a new OTP.',
            }, { status: 400 });
          }

          return NextResponse.json({
            success: false,
            error: 'Invalid OTP. Please check and try again.',
          }, { status: 401 });
        }
      } catch (supabaseErr) {
        console.error('Supabase verify error:', supabaseErr);
        return NextResponse.json({
          success: false,
          error: 'Failed to verify OTP. Please try again.',
        }, { status: 500 });
      }
    } else {
      // ── Fallback: Verify via local PlatformSetting ──
      const key = `otp:${normalized}`;
      const record = await db.platformSetting.findUnique({ where: { key } });

      if (!record) {
        return NextResponse.json({ success: false, error: 'No OTP found. Please request a new one.' }, { status: 400 });
      }

      const data = JSON.parse(record.value);

      if (new Date(data.expiresAt).getTime() < Date.now()) {
        await db.platformSetting.delete({ where: { key } });
        return NextResponse.json({ success: false, error: 'OTP has expired. Please request a new one.' }, { status: 400 });
      }

      if (data.attempts >= MAX_OTP_ATTEMPTS) {
        await db.platformSetting.delete({ where: { key } });
        return NextResponse.json({ success: false, error: 'Too many failed attempts. Please request a new OTP.' }, { status: 429 });
      }

      if (data.otp !== otpClean) {
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

      // Local OTP verified — clean up
      await db.platformSetting.delete({ where: { key } }).catch(() => {});
      otpVerified = true;
    }

    if (!otpVerified) {
      return NextResponse.json({ success: false, error: 'OTP verification failed.' }, { status: 401 });
    }

    // ── Generate verification token for registration step ──
    const verifyToken = `verified_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

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

    // Clean up method record
    await db.platformSetting.delete({ where: { key: `otp_method:${normalized}` } }).catch(() => {});

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
