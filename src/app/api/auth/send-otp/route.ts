import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isDisposableEmail } from '@/lib/temp-email-domains';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

/**
 * POST /api/auth/send-otp
 * Body: { email: string }
 *
 * Sends a 6-digit OTP via Supabase Auth.
 * Falls back to console log if Supabase is not configured.
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

    // Check if email already registered
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      // ── Send OTP via Supabase Auth ──
      try {
        const authRes = await fetch(`${supabaseUrl}/auth/v1/otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
          },
          body: JSON.stringify({
            email: normalized,
            create_user: true,
          }),
        });

        if (!authRes.ok) {
          const errData = await authRes.json().catch(() => ({}));
          console.error('Supabase OTP error:', errData);
          return NextResponse.json({
            success: false,
            error: 'Failed to send OTP. Please try again.',
          }, { status: 500 });
        }
      } catch (supabaseErr) {
        console.error('Supabase OTP send error:', supabaseErr);
        return NextResponse.json({
          success: false,
          error: 'Failed to connect to email service. Please try again.',
        }, { status: 500 });
      }
    } else {
      // ── Fallback: Generate OTP locally (dev mode) ──
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
      await db.platformSetting.upsert({
        where: { key: `otp:${normalized}` },
        create: { key: `otp:${normalized}`, value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), attempts: 0 }) },
        update: { value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), attempts: 0 }) },
      });
      console.log(`[OTP DEV] Email: ${normalized}, OTP: ${otp} (Supabase not configured — OTP logged to console)`);
    }

    // Update rate limit
    await db.platformSetting.upsert({
      where: { key: rateLimitKey },
      create: { key: rateLimitKey, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    // Store email as "OTP sent" flag so verify-otp knows which method to use
    await db.platformSetting.upsert({
      where: { key: `otp_method:${normalized}` },
      create: { key: `otp_method:${normalized}`, value: supabaseUrl ? 'supabase' : 'local' },
      update: { value: supabaseUrl ? 'supabase' : 'local' },
    });

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 });
  }
}
