import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, JWTPayload } from '@/lib/auth';
import { isDisposableEmail } from '@/lib/temp-email-domains';
import { FREE_VIRTUAL_CAPITAL } from '@/lib/tier';

const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface GoogleTokenBody {
  token: string;
  fingerprint?: string; // device fingerprint from client
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GoogleTokenBody;

    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Google access token is required' },
        { status: 400 }
      );
    }

    // Verify the Google ID token by calling Google's tokeninfo endpoint
    const googleTokenInfoUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${body.token}`;
    const tokenRes = await fetch(googleTokenInfoUrl);
    const tokenData = await tokenRes.json();

    if (!tokenData.sub || !tokenData.email) {
      console.error('Google token verification failed:', tokenData);
      return NextResponse.json(
        { success: false, error: 'Invalid Google token. Please try again.' },
        { status: 401 }
      );
    }

    const googleId = tokenData.sub;
    const email = tokenData.email.toLowerCase().trim();
    const name = tokenData.name || email.split('@')[0];
    const picture = tokenData.picture || null;

    // Block disposable emails for new signups
    const isExistingUser = await db.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!isExistingUser && isDisposableEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Disposable email addresses are not allowed. Please use a real email.' },
        { status: 403 }
      );
    }

    let user;
    let isNewUser = false;

    if (isExistingUser) {
      if (!isExistingUser.googleId) {
        user = await db.user.update({
          where: { id: isExistingUser.id },
          data: { googleId, avatar: picture || isExistingUser.avatar },
        });
      } else {
        user = isExistingUser;
      }
    } else {
      // New user — check device fingerprint for trial abuse
      let deviceTrialUsed = false;
      if (body.fingerprint) {
        const deviceKey = `device_trial:${body.fingerprint}`;
        const deviceRecord = await db.platformSetting.findUnique({ where: { key: deviceKey } });
        if (deviceRecord) {
          const deviceData = JSON.parse(deviceRecord.value);
          deviceTrialUsed = deviceData.used === true;
        }
      }

      const tier = deviceTrialUsed ? 'PREMIUM' : 'FREE';
      const virtualCapital = deviceTrialUsed ? 0 : FREE_VIRTUAL_CAPITAL;

      user = await db.user.create({
        data: {
          email,
          name,
          passwordHash: null,
          googleId,
          avatar: picture || null,
          role: 'USER',
          tier,
          virtualCapital,
          notifSettings: {
            emailVerified: true, // Google already verified
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      await db.portfolio.create({
        data: {
          userId: user.id,
          totalBalance: virtualCapital,
          availableMargin: virtualCapital,
        },
      });

      // Mark device as trial-used
      if (body.fingerprint && !deviceTrialUsed) {
        await db.platformSetting.upsert({
          where: { key: `device_trial:${body.fingerprint}` },
          create: {
            key: `device_trial:${body.fingerprint}`,
            value: JSON.stringify({ used: true, userId: user.id, date: new Date().toISOString() }),
          },
          update: {
            value: JSON.stringify({ used: true, userId: user.id, date: new Date().toISOString() }),
          },
        });
      }

      isNewUser = true;
    }

    // Generate JWT
    const jwtPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role as 'USER' | 'ADMIN',
      tier: user.tier as 'FREE' | 'PREMIUM',
    };
    const token = signToken(jwtPayload);

    // Create session
    const device = req.headers.get('user-agent') || 'Unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';
    const expiresAt = new Date(Date.now() + JWT_EXPIRES_MS);
    await db.session.create({
      data: { userId: user.id, token, device, ip, expiresAt },
    });

    const { passwordHash: _ph, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        virtualCapital: Number(safeUser.virtualCapital),
      },
      token,
      isNewUser,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during Google authentication' },
      { status: 500 }
    );
  }
}
