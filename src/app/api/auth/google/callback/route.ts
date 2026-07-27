import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/google/callback
 *
 * Handles the OAuth redirect callback from Google.
 * 1. Receives `code` from Google
 * 2. Exchanges code for tokens via Google's token endpoint
 * 3. Uses the id_token to get user info
 * 4. Creates/updates user in database
 * 5. Redirects to /dashboard with a short-lived auth token in the URL hash
 *
 * This replaces the GSI popup flow which had FedCM/popup-blocking issues.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = `${new URL(req.url).origin}/api/auth/google/callback`;

  try {
    // Step 1: Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      console.error('Google token exchange error:', errData);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', req.url));
    }

    const tokenData = await tokenRes.json();
    const idToken = tokenData.id_token;

    if (!idToken) {
      console.error('No id_token in response:', Object.keys(tokenData));
      return NextResponse.redirect(new URL('/login?error=no_id_token', req.url));
    }

    // Step 2: Verify ID token and get user info
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    const userData = await verifyRes.json();

    if (!userData.sub || !userData.email) {
      console.error('Invalid token info:', userData);
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    // Step 3: Create/update user and session via our internal API
    const { db } = await import('@/lib/db');
    const { signToken } = await import('@/lib/auth');
    const { isDisposableEmail } = await import('@/lib/temp-email-domains');
    const { FREE_VIRTUAL_CAPITAL } = await import('@/lib/tier');

    const googleId = userData.sub;
    const email = userData.email.toLowerCase().trim();
    const name = userData.name || email.split('@')[0];
    const picture = userData.picture || null;

    const isExistingUser = await db.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!isExistingUser && isDisposableEmail(email)) {
      return NextResponse.redirect(new URL('/login?error=disposable_email', req.url));
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
      // New Google user — give FREE trial
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
          notifSettings: {
            emailVerified: true,
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      await db.portfolio.create({
        data: {
          userId: user.id,
          totalBalance: FREE_VIRTUAL_CAPITAL,
          availableMargin: FREE_VIRTUAL_CAPITAL,
        },
      });

      isNewUser = true;
    }

    // Step 4: Generate JWT + Session
    const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'USER' | 'ADMIN',
      tier: user.tier as 'FREE' | 'PREMIUM',
    });

    const device = req.headers.get('user-agent') || 'Unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';
    await db.session.create({
      data: {
        userId: user.id,
        token,
        device,
        ip,
        expiresAt: new Date(Date.now() + JWT_EXPIRES_MS),
      },
    });

    // Step 5: Redirect to dashboard with token in URL (the SPA will pick it up)
    const redirectUrl = new URL('/dashboard', req.url);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('new', String(isNewUser));
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=internal_error', req.url));
  }
}
