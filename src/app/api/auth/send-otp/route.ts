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
 * 1. Call Supabase `generate_link` admin API with type='signup' + dummy password
 *    This sends a real OTP email via Supabase AND returns `email_otp` in response
 * 2. Store THAT returned email_otp in our PlatformSetting (matches what user sees in email)
 * 3. Fallback: Generate our own 6-digit OTP + send via Resend
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

    // Update rate limit immediately
    await db.platformSetting.upsert({
      where: { key: rateLimitKey },
      create: { key: rateLimitKey, value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    // ── STEP 1: Try Supabase generate_link (sends real OTP email) ──
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let storedOtp = '';
    let emailSent = false;
    let usedSupabase = false;

    if (supabaseUrl && supabaseKey) {
      try {
        // Generate a random password for Supabase signup (user sets their own in step 3)
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

        if (linkRes.ok) {
          const linkData = await linkRes.json();

          // CRITICAL: Use the email_otp from Supabase response
          if (linkData.email_otp) {
            storedOtp = String(linkData.email_otp);
            usedSupabase = true;
            emailSent = true;
            console.log(`[SEND-OTP] Supabase signup OTP sent to ${normalized}, email_otp: ${storedOtp}`);
          } else {
            console.log('[SEND-OTP] No email_otp in response, keys:', Object.keys(linkData));
          }
        } else {
          const errData = await linkRes.json().catch(() => ({}));
          console.error('[SEND-OTP] Supabase generate_link error:', errData);

          // If user already exists in Supabase (from previous attempt), try magiclink
          if (errData?.error_code === 'user_already_exists' || errData?.msg?.includes('already registered')) {
            console.log('[SEND-OTP] User exists in Supabase, trying magiclink...');
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

            if (magicRes.ok) {
              const magicData = await magicRes.json();
              if (magicData.email_otp) {
                storedOtp = String(magicData.email_otp);
                usedSupabase = true;
                emailSent = true;
                console.log(`[SEND-OTP] Supabase magiclink sent to ${normalized}, OTP: ${storedOtp}`);
              }
            } else {
              console.error('[SEND-OTP] Magiclink also failed');
            }
          }
        }
      } catch (supabaseErr) {
        console.error('[SEND-OTP] Supabase error:', supabaseErr);
      }
    }

    // ── STEP 2: Fallback — Generate our own OTP + send via Resend ──
    if (!emailSent) {
      storedOtp = String(Math.floor(100000 + Math.random() * 900000));
      console.log(`[SEND-OTP] Fallback: local OTP for Resend: ${storedOtp}`);

      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: 'Pepertect <onboarding@resend.dev>',
            to: [normalized],
            subject: 'Your Pepertect Verification Code',
            html: generateOtpEmailHtml(storedOtp),
          });
          emailSent = true;
          console.log(`[SEND-OTP] Resend email sent to ${normalized}`);
        } catch (resendErr) {
          console.error('[SEND-OTP] Resend failed:', resendErr);
        }
      }
    }

    // Store OTP in PlatformSetting — THIS is what verify-otp will check against
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    await db.platformSetting.upsert({
      where: { key: `otp:${normalized}` },
      create: {
        key: `otp:${normalized}`,
        value: JSON.stringify({
          otp: storedOtp,
          otpLength: storedOtp.length,
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          via: usedSupabase ? 'supabase' : 'resend',
        }),
      },
      update: {
        value: JSON.stringify({
          otp: storedOtp,
          otpLength: storedOtp.length,
          expiresAt: expiresAt.toISOString(),
          attempts: 0,
          via: usedSupabase ? 'supabase' : 'resend',
        }),
      },
    });

    if (!emailSent) {
      console.log(`[SEND-OTP] WARNING: No email sent to ${normalized}. OTP: ${storedOtp}`);
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'OTP sent to your email. Please check your inbox.'
        : 'OTP generated. Check server logs.',
      otpLength: storedOtp.length, // tell frontend how many digits to expect
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send OTP' }, { status: 500 });
  }
}

/* ── Professional OTP Email Template (Resend fallback only) ── */
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
