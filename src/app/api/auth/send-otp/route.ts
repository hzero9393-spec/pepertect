import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isDisposableEmail } from '@/lib/temp-email-domains';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

/**
 * POST /api/auth/send-otp
 * Body: { email: string }
 *
 * Uses Supabase Auth `/auth/v1/otp` endpoint which sends a proper
 * OTP CODE email (not magic link) to the user's inbox.
 *
 * The user sees a 6-digit code in their email from Supabase.
 * Verification is done via Supabase `/auth/v1/verify`.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Valid email is required' }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    // Block disposable emails
    if (isDisposableEmail(normalized)) {
      return NextResponse.json({
        success: false,
        error: 'Disposable/temporary email addresses are not allowed. Please use a real email.',
      }, { status: 403 });
    }

    // Check if email already registered in OUR database
    const existing = await db.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists. Please sign in.' }, { status: 409 });
    }

    // Rate limit
    const rateLimitKey = `otp_rate:${normalized}`;
    const rateLimitRecord = await db.platformSetting.findUnique({ where: { key: rateLimitKey } });
    if (rateLimitRecord) {
      const lastSent = new Date(rateLimitRecord.value).getTime();
      if (Date.now() - lastSent < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
        return NextResponse.json({
          success: false,
          error: `Please wait ${waitSec} seconds before requesting another OTP`,
        }, { status: 429 });
      }
    }

    // Update rate limit
    await db.platformSetting.upsert({
      where: { key: rateLimitKey },
      create: { key: rateLimitKey, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    // ── Send OTP email via Supabase /auth/v1/otp ──
    // This endpoint sends a proper OTP CODE email (shows the number in email)
    // NOT a magic link — the user sees a 6-digit code in their email
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Email service not configured' }, { status: 500 });
    }

    const otpRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        email: normalized,
        type: 'email',
        create_user: true,
      }),
    });

    if (!otpRes.ok) {
      const errData = await otpRes.json().catch(() => ({}));
      console.error('[SEND-OTP] Supabase /auth/v1/otp error:', errData);

      // If rate limited by Supabase
      if (errData?.error_code === 'over_email_send_rate_limit') {
        return NextResponse.json({
          success: false,
          error: 'Too many OTP requests. Please wait 1 minute and try again.',
        }, { status: 429 });
      }

      return NextResponse.json({ success: false, error: 'Failed to send OTP email. Please try again.' }, { status: 500 });
    }

    // Success — Supabase sent the OTP email with a 6-digit code
    console.log(`[SEND-OTP] OTP email sent to ${normalized} via Supabase /auth/v1/otp`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email. Please check your inbox and spam folder.',
      otpLength: 6,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 });
  }
}
