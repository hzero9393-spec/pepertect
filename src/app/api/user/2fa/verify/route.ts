import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

/**
 * Verify a TOTP code against the stored secret and enable 2FA if valid.
 *
 * POST /api/user/2fa/verify
 * Body: { token: "123456" }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Verification code is required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: '2FA is already enabled' },
        { status: 400 }
      );
    }
    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { success: false, error: 'No 2FA setup in progress. Please start again.' },
        { status: 400 }
      );
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token.replace(/\s+/g, ''),
      window: 1, // allow 1 step of drift (~30s)
    });

    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code. Try again.' },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: auth.userId },
      data: { twoFactorEnabled: true },
    });

    await logActivity({
      userId: auth.userId,
      action: '2FA_ENABLE',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify 2FA code' },
      { status: 500 }
    );
  }
}
