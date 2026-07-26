import { NextRequest, NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

/**
 * Initiate 2FA setup — generates a new TOTP secret, stores it on the user
 * (but twoFactorEnabled stays false until verified), and returns a QR code
 * data URL + otpauth URI for the user to scan with their authenticator app.
 *
 * POST /api/user/2fa/enable
 * Response: { secret, qrDataUrl, otpauthUrl }
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { success: false, error: '2FA is already enabled. Disable it first to reconfigure.' },
        { status: 400 }
      );
    }

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Pepertect:${user.email}`,
      issuer: 'Pepertect',
    });

    // Save the secret temporarily — user has to verify a TOTP code to confirm.
    await db.user.update({
      where: { id: auth.userId },
      data: { twoFactorSecret: secret.base32 },
    });

    const otpauthUrl = secret.otpauth_url!;
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 240,
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    return NextResponse.json({
      success: true,
      data: {
        secret: secret.base32,
        otpauthUrl,
        qrDataUrl,
      },
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate 2FA setup' },
      { status: 500 }
    );
  }
}
