import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isDisposableEmail } from '@/lib/temp-email-domains';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

/**
 * POST /api/auth/send-otp
 * Body: { email: string }
 *
 * Generates a 6-digit OTP, stores it in PlatformSetting, and sends via Resend.
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

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    // Store OTP in PlatformSetting
    await db.platformSetting.upsert({
      where: { key: `otp:${normalized}` },
      create: {
        key: `otp:${normalized}`,
        value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), attempts: 0 }),
      },
      update: {
        value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), attempts: 0 }),
      },
    });

    // Update rate limit
    await db.platformSetting.upsert({
      where: { key: rateLimitKey },
      create: { key: rateLimitKey, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: 'Pepertect <noreply@pepertect.com>',
          to: [normalized],
          subject: 'Your Pepertect Verification Code',
          html: `
            <div style="max-width:400px;margin:0 auto;font-family:system-ui,sans-serif;padding:20px;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="margin:0;color:#2563EB;font-size:24px;">Pepertect</h1>
                <p style="color:#6B7280;margin:8px 0 0;font-size:14px;">Paper Trading Platform</p>
              </div>
              <div style="background:#F9FAFB;border-radius:12px;padding:24px;text-align:center;border:1px solid #E5E7EB;">
                <p style="color:#374151;margin:0 0 12px;font-size:14px;">Your verification code is:</p>
                <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;font-family:monospace;">${otp}</div>
                <p style="color:#9CA3AF;margin:12px 0 0;font-size:12px;">Valid for 10 minutes</p>
              </div>
              <p style="color:#9CA3AF;text-align:center;font-size:12px;margin-top:24px;">
                If you didn't request this code, ignore this email.<br>
                Never share this code with anyone.
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Resend email error:', emailErr);
        // Still return success — OTP is stored, useful for testing without Resend
      }
    } else {
      console.log(`[OTP DEV] Email: ${normalized}, OTP: ${otp} (Resend API key not set — OTP logged to console)`);
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 });
  }
}
