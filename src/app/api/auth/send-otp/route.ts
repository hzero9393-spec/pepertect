import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isDisposableEmail } from '@/lib/temp-email-domains';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

/**
 * POST /api/auth/send-otp
 * Body: { email: string }
 *
 * Uses Supabase Auth admin API `generate_link` to:
 * 1. Send an OTP email to the user's Gmail/inbox
 * 2. Return the `email_otp` (8 digits) from the response
 * 3. Store that OTP in our PlatformSetting for verification
 *
 * The OTP that Supabase puts in the email is THE SAME as email_otp in the response.
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

    // Rate limit: check last OTP sent time
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

    // ── Send OTP email via Supabase generate_link ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Email service not configured' }, { status: 500 });
    }

    // generate_link with type='signup' requires a password
    const randomPassword = 'Temp' + Math.random().toString(36).slice(2, 12) + '!X1';

    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        type: 'signup',
        email: normalized,
        password: randomPassword,
      }),
    });

    if (!linkRes.ok) {
      const errData = await linkRes.json().catch(() => ({}));

      // If user already exists in Supabase, try magiclink type
      if (errData?.msg?.includes('already registered') || errData?.error_code === 'user_already_exists') {
        const magicRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            type: 'magiclink',
            email: normalized,
          }),
        });

        if (!magicRes.ok) {
          console.error('[SEND-OTP] Both signup and magiclink failed:', await magicRes.json().catch(() => ({})));
          return NextResponse.json({ success: false, error: 'Failed to send OTP email. Please try again.' }, { status: 500 });
        }

        const magicData = await magicRes.json();
        if (!magicData.email_otp) {
          console.error('[SEND-OTP] magiclink response has no email_otp:', Object.keys(magicData));
          return NextResponse.json({ success: false, error: 'Failed to generate OTP. Please try again.' }, { status: 500 });
        }

        // Store magiclink OTP
        const otp = String(magicData.email_otp);
        await storeOtp(normalized, otp);
        await updateRateLimit(rateLimitKey);

        console.log(`[SEND-OTP] Magiclink OTP sent to ${normalized}, OTP length: ${otp.length}`);
        return NextResponse.json({
          success: true,
          message: 'OTP sent to your email. Please check your inbox.',
          otpLength: otp.length,
        });
      }

      console.error('[SEND-OTP] Supabase error:', errData);
      return NextResponse.json({ success: false, error: 'Failed to send OTP email. Please try again.' }, { status: 500 });
    }

    const linkData = await linkRes.json();

    if (!linkData.email_otp) {
      console.error('[SEND-OTP] No email_otp in response:', Object.keys(linkData));
      return NextResponse.json({ success: false, error: 'Failed to generate OTP. Please try again.' }, { status: 500 });
    }

    // Use Supabase's OTP — this is the SAME code that's in the email
    const otp = String(linkData.email_otp);

    // Store OTP in our DB
    await storeOtp(normalized, otp);
    await updateRateLimit(rateLimitKey);

    console.log(`[SEND-OTP] Signup OTP sent to ${normalized}, OTP length: ${otp.length}, confirmed: ${!!linkData.confirmation_sent_at}`);

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email. Please check your inbox and spam folder.',
      otpLength: otp.length,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 });
  }
}

/* ── Store OTP in PlatformSetting ── */
async function storeOtp(email: string, otp: string) {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  await db.platformSetting.upsert({
    where: { key: `otp:${email}` },
    create: {
      key: `otp:${email}`,
      value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), attempts: 0 }),
    },
    update: {
      value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), attempts: 0 }),
    },
  });
}

/* ── Update rate limit ── */
async function updateRateLimit(key: string) {
  await db.platformSetting.upsert({
    where: { key },
    create: { key, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });
}
