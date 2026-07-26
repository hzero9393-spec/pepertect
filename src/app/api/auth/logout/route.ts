import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractBearerToken, verifyToken } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Identify the user before deleting the session so we can log the event
    const payload = verifyToken(token);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;

    // Delete session from DB where token matches
    await db.session.deleteMany({ where: { token } });

    if (payload?.userId) {
      await logActivity({
        userId: payload.userId,
        action: 'LOGOUT',
        ip,
        userAgent,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during logout' },
      { status: 500 }
    );
  }
}
