import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, JWTPayload } from '@/lib/auth';
import { FREE_VIRTUAL_CAPITAL } from '@/lib/tier';

const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface GoogleTokenBody {
  token: string; // Google ID token (JWT) from the client
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
    const email = tokenData.email;
    const name = tokenData.name || email.split('@')[0];
    const picture = tokenData.picture || null;

    // Find existing user by googleId or email
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email },
        ],
      },
    });

    let user;
    if (existingUser) {
      // If user exists but googleId is not set, update it
      if (!existingUser.googleId) {
        user = await db.user.update({
          where: { id: existingUser.id },
          data: { googleId, avatar: picture || existingUser.avatar },
        });
      } else {
        user = existingUser;
      }
    } else {
      // Create new user from Google auth
      user = await db.user.create({
        data: {
          email,
          name,
          passwordHash: null,
          googleId,
          avatar: picture || null,
          role: 'USER',
          tier: 'FREE',
          virtualCapital: FREE_VIRTUAL_CAPITAL,
        },
      });

      // Create portfolio for the new user
      await db.portfolio.create({
        data: {
          userId: user.id,
          totalBalance: FREE_VIRTUAL_CAPITAL,
          availableMargin: FREE_VIRTUAL_CAPITAL,
        },
      });
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
      data: {
        userId: user.id,
        token,
        device,
        ip,
        expiresAt,
      },
    });

    // Return user without passwordHash
    const { passwordHash: _ph, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        virtualCapital: Number(safeUser.virtualCapital),
      },
      token,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during Google authentication' },
      { status: 500 }
    );
  }
}
