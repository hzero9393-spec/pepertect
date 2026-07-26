import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

/**
 * Disable 2FA — requires the user's current TOTP token to confirm.
 *
 * POST /api/user/2fa/disable
 * Body: { token: "123456" }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { token } = await req.json();

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Confirm with current TOTP token before disabling
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Verification code is required to disable 2FA' },
        { status: 400 }
      );
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token: token.replace(/\s+/g, ''),
      window: 1,
    });
    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification code. 2FA not disabled.' },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: auth.userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    await logActivity({
      userId: auth.userId,
      action: '2FA_DISABLE',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
