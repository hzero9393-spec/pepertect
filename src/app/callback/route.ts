import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, storeToken, pushTokenToWorker, ADMIN_USER_ID } from '@/lib/upstox';
import { prisma } from '@/lib/db';

/**
 * GET /callback?code=XXX&state=YYY
 *
 * Upstox OAuth redirect handler. Receives the authorization code, exchanges
 * it for an access token, stores it in the DB, and pushes it to the
 * Cloudflare Worker for hot reload.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/upstox-status?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/upstox-status?error=missing_code', req.url)
    );
  }

  try {
    // Exchange code for token
    const tokenRes = await exchangeCodeForToken(code);

    // Determine user ID to associate the token with
    let userId = ADMIN_USER_ID;
    if (!userId) {
      const sessionToken = req.cookies.get('auth_token')?.value ||
                          req.cookies.get('session')?.value;
      if (sessionToken) {
        const session = await prisma.session.findUnique({
          where: { token: sessionToken },
          include: { user: true },
        });
        if (session && session.user) {
          userId = session.user.id;
        }
      }
    }

    if (!userId) {
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
      });
      const anyUser = adminUser || await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      userId = anyUser?.id || null;
    }

    if (!userId) {
      return NextResponse.redirect(
        new URL('/upstox-status?error=no_user', req.url)
      );
    }

    // Store token
    await storeToken(userId, tokenRes);

    // Push token to Cloudflare Worker
    const pushed = await pushTokenToWorker(tokenRes.access_token);

    const params = new URLSearchParams({
      success: '1',
      email: tokenRes.email || '',
      expires_in: String(tokenRes.expires_in),
      worker: pushed ? 'updated' : 'failed',
    });
    return NextResponse.redirect(
      new URL(`/upstox-status?${params.toString()}`, req.url)
    );
  } catch (e: any) {
    console.error('[/callback] Upstox OAuth failed:', e);
    return NextResponse.redirect(
      new URL(`/upstox-status?error=${encodeURIComponent(e.message || 'unknown')}`, req.url)
    );
  }
}
