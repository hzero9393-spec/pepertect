import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/user/logout-all
 * Deletes every active session for this user except the one making the
 * request (so the caller stays logged in to confirm the action took effect).
 * Also expires all ActiveDevice records.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    // Delete all sessions except the current one (matching token), and any
    // that have already expired.
    const deletedSessions = await db.session.deleteMany({
      where: {
        userId: auth.userId,
        NOT: token ? { token } : undefined,
      },
    });

    // Touch active_devices so they show as logged out
    await db.activeDevice.deleteMany({
      where: { userId: auth.userId },
    });

    await logActivity({
      userId: auth.userId,
      action: 'LOGOUT_ALL',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      details: { sessionsEnded: deletedSessions.count },
    });

    return NextResponse.json({
      success: true,
      message: `Ended ${deletedSessions.count} other session(s).`,
      data: { sessionsEnded: deletedSessions.count },
    });
  } catch (error) {
    console.error('Logout all error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to logout all sessions' },
      { status: 500 }
    );
  }
}
