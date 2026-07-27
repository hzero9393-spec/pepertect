import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { isDisposableEmail } from '@/lib/temp-email-domains';
import { FREE_VIRTUAL_CAPITAL } from '@/lib/tier';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const acceptedTerms = body.acceptedTerms === true;
    const acceptedPrivacy = body.acceptedPrivacy === true;
    const fingerprint = body.fingerprint;

    /* Enforce legal acceptance */
    if (!acceptedTerms || !acceptedPrivacy) {
      return NextResponse.json(
        { success: false, error: 'You must accept the Terms & Conditions and Privacy Policy' },
        { status: 400 }
      );
    }

    /* Enforce disposable email block */
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Disposable email addresses are not allowed' },
        { status: 403 }
      );
    }

    /* Device fingerprint check — has this device already used a free trial? */
    let deviceTrialUsed = false;
    if (fingerprint) {
      const deviceKey = `device_trial:${fingerprint}`;
      const deviceRecord = await db.platformSetting.findUnique({ where: { key: deviceKey } });
      if (deviceRecord) {
        const deviceData = JSON.parse(deviceRecord.value);
        deviceTrialUsed = deviceData.used === true;
      }
    }

    // Determine tier based on device trial status
    const tier = deviceTrialUsed ? 'PREMIUM' : 'FREE';
    const virtualCapital = deviceTrialUsed ? 0 : FREE_VIRTUAL_CAPITAL;

    /* Check if email already exists */
    const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'USER',
        tier,
        virtualCapital,
        notifSettings: {
          legalAcceptance: {
            terms: { accepted: true, at: new Date().toISOString() },
            privacy: { accepted: true, at: new Date().toISOString() },
            version: '2026-07-27',
          },
          emailVerified: true,
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    // Create portfolio
    await db.portfolio.create({
      data: {
        userId: user.id,
        totalBalance: virtualCapital,
        availableMargin: virtualCapital,
      },
    });

    /* Mark device as trial-used (only if they got FREE tier) */
    if (fingerprint && !deviceTrialUsed) {
      await db.platformSetting.upsert({
        where: { key: `device_trial:${fingerprint}` },
        create: {
          key: `device_trial:${fingerprint}`,
          value: JSON.stringify({ used: true, userId: user.id, date: new Date().toISOString() }),
        },
        update: {
          value: JSON.stringify({ used: true, userId: user.id, date: new Date().toISOString() }),
        },
      });
    }

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: 'USER',
      tier: tier as 'FREE' | 'PREMIUM',
    });

    // Create session
    const expiresAt = new Date(Date.now() + JWT_EXPIRES_MS);
    const device = req.headers.get('user-agent') || 'Unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';
    await db.session.create({
      data: { userId: user.id, token, device, ip, expiresAt },
    });

    const { passwordHash: _ph, ...safeUser } = user;

    return NextResponse.json(
      {
        success: true,
        user: { ...safeUser, virtualCapital: Number(safeUser.virtualCapital) },
        token,
        deviceTrialUsed,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
