import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Extract Bearer token
    const token = extractBearerToken(req.headers.get('authorization'));
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify JWT
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Find user by userId
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check session exists in DB
    const session = await db.session.findUnique({ where: { token } });
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found or expired' },
        { status: 401 }
      );
    }

    // Check if session is not expired
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } });
      return NextResponse.json(
        { success: false, error: 'Session has expired' },
        { status: 401 }
      );
    }

    // Return user without passwordHash
    const { passwordHash: _ph, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...safeUser,
        virtualCapital: Number(safeUser.virtualCapital),
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
