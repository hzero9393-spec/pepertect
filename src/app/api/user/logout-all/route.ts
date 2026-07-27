import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/user/logout-all?includeCurrent=true
 *
 * Default (no query param): deletes every active session for this user EXCEPT
 * the one making the request (so the caller stays logged in to confirm).
 *
 * With ?includeCurrent=true: deletes ALL sessions including the current one.
 * The client should redirect to the landing page after this call.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    const url = new URL(req.url);
    const includeCurrent = url.searchParams.get('includeCurrent') === 'true';

    // If includeCurrent=true, delete ALL sessions (including current).
    // Otherwise, delete all sessions EXCEPT the current one.
    const where = includeCurrent
      ? { userId: auth.userId }
      : {
          userId: auth.userId,
          NOT: token ? { token } : undefined,
        };

    const deletedSessions = await db.session.deleteMany({ where });

    // Touch active_devices so they show as logged out
    await db.activeDevice.deleteMany({
      where: { userId: auth.userId },
    });

    await logActivity({
      userId: auth.userId,
      action: 'LOGOUT_ALL',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      details: { sessionsEnded: deletedSessions.count, includeCurrent },
    });

    return NextResponse.json({
      success: true,
      message: includeCurrent
        ? `Removed account from all ${deletedSessions.count} device(s).`
        : `Ended ${deletedSessions.count} other session(s).`,
      data: { sessionsEnded: deletedSessions.count, includeCurrent },
    });
  } catch (error) {
    console.error('Logout all error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to logout all sessions' },
      { status: 500 }
    );
  }
}

