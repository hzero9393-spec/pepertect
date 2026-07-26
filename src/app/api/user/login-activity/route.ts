import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

/**
 * GET /api/user/login-activity
 * Returns recent activity logs (logins, logouts, password changes, 2FA events)
 * plus currently active sessions for the authenticated user.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const [logs, sessions] = await Promise.all([
      db.activityLog.findMany({
        where: {
          userId: auth.userId,
          action: {
            in: ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', '2FA_ENABLE', '2FA_DISABLE', 'LOGOUT_ALL'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      db.session.findMany({
        where: { userId: auth.userId, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs: logs.map((l) => ({
          id: l.id,
          action: l.action,
          ip: l.ip,
          userAgent: l.userAgent,
          details: l.details,
          createdAt: l.createdAt,
        })),
        sessions: sessions.map((s) => ({
          id: s.id,
          device: s.device,
          ip: s.ip,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          isCurrent: false, // we don't know which session is current without more bookkeeping
        })),
      },
    });
  } catch (error) {
    console.error('Login activity fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch login activity' },
      { status: 500 }
    );
  }
}
