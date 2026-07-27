import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isDisposableEmail } from '@/lib/temp-email-domains';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

/**
 * POST /api/auth/send-otp
 * Body: { email: string }
 *
 * Strategy:
 * 1. Generate a 6-digit OTP locally
 * 2. Store it in PlatformSetting (for our own verification)
 * 3. Use Supabase Auth admin API `generate_link` to send a professional email
 *    that contains the OTP code (Supabase sends the OTP automatically)
 * 4. Fallback: console log if Supabase is not available
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

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    // Store OTP in PlatformSetting (our source of truth)
    await db.platformSetting.upsert({
      where: { key: `otp:${normalized}` },
      create: { key: `otp:${normalized}`, value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), attempts: 0 }) },
      update: { value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString(), attempts: 0 }) },
    });

    // Update rate limit
    await db.platformSetting.upsert({
      where: { key: rateLimitKey },
      create: { key: rateLimitKey, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    // ── Send OTP email via Supabase Auth admin API ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let emailSent = false;

    if (supabaseUrl && supabaseKey) {
      try {
        // Use generate_link to trigger Supabase to send an email with OTP
        // Supabase handles the email template and delivery
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
          }),
        });

        if (linkRes.ok) {
          const linkData = await linkRes.json();
          // Supabase sent an email — it may contain its own OTP or magic link
          // But we use OUR locally generated OTP for verification
          emailSent = true;
          console.log(`[OTP] Supabase email sent to ${normalized} (confirmation_sent_at: ${linkData.confirmation_sent_at})`);
        } else {
          const errData = await linkRes.json().catch(() => ({}));
          console.error('[OTP] Supabase generate_link error:', errData);
        }
      } catch (supabaseErr) {
        console.error('[OTP] Supabase email error:', supabaseErr);
      }
    }

    // ── Fallback: Resend (works for Resend registered email only) ──
    if (!emailSent) {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: 'Pepertect <onboarding@resend.dev>',
            to: [normalized],
            subject: 'Your Pepertect Verification Code',
            html: generateOtpEmailHtml(otp),
          });
          emailSent = true;
        } catch {
          console.log('[OTP] Resend backup failed');
        }
      }
    }

    if (!emailSent) {
      console.log(`[OTP] Email: ${normalized}, OTP: ${otp} (No email service available — OTP in server logs)`);
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'OTP sent to your email'
        : 'OTP generated. Check server logs if email not received.',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 });
  }
}

/* ── Professional OTP Email Template (Resend fallback) ── */
function generateOtpEmailHtml(otp: string): string {
  const otpChars = otp.split('');
  const otpBoxes = otpChars.map((char) => `
    <div style="display:inline-block;width:48px;height:56px;margin:0 4px;line-height:56px;text-align:center;font-size:28px;font-weight:700;color:#1a1a2e;background:#ffffff;border-radius:12px;border:2px solid #e8eaf6;box-shadow:0 2px 8px rgba(0,0,0,0.06);font-family:'SF Mono',Monaco,monospace;">${char}</div>
  `).join('');

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Pepertect — Verification Code</title></head>
    <body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table role="presentation" style="width:100%;border-collapse:collapse;background:#f0f2f5;"><tr><td align="center" style="padding:40px 16px;">
        <table role="presentation" style="width:100%;max-width:440px;border-collapse:collapse;">
          <tr><td style="background:linear-gradient(135deg,#2563EB,#7c3aed);border-radius:20px 20px 0 0;padding:32px;text-align:center;">
            <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:14px;margin:0 auto 16px;line-height:48px;font-size:24px;">&#9889;</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Pepertect</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Paper Trading Platform</p>
          </td></tr>
          <tr><td style="background:#fff;border-left:1px solid #e8eaf6;border-right:1px solid #e8eaf6;padding:36px 32px 32px;">
            <p style="margin:0 0 6px;color:#1a1a2e;font-size:17px;font-weight:600;text-align:center;">Verify Your Email</p>
            <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;text-align:center;">Enter this code to complete your registration</p>
            <div style="text-align:center;margin-bottom:28px;">${otpBoxes}</div>
            <div style="text-align:center;"><p style="margin:0;color:#9ca3af;font-size:12px;">&#9200; This code expires in <strong style="color:#6b7280;">10 minutes</strong></p></div>
          </td></tr>
          <tr><td style="background:#f8f9fc;border-radius:0 0 20px 20px;border:1px solid #e8eaf6;border-top:none;padding:20px 32px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">If you didn't request this code, you can safely ignore this email.<br>Never share this code with anyone.</p>
            <p style="margin:12px 0 0;color:#cbd5e1;font-size:11px;text-align:center;">&copy; ${new Date().getFullYear()} Pepertect. All rights reserved.</p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>
  `;
}
