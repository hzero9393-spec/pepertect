import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, JWTPayload } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { logActivity } from '@/lib/activity';
import bcrypt from 'bcryptjs';

const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Find user by email
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Compare password — OAuth users have no passwordHash
    if (!user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'This account uses OAuth. Please sign in with Google.' },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Extract device info and IP
    const device = req.headers.get('user-agent') || 'Unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';

    // Generate JWT
    const jwtPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role as 'USER' | 'ADMIN',
      tier: user.tier as 'FREE' | 'PREMIUM',
    };
    const token = signToken(jwtPayload);

    // Create session
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

    // Record activity log entry (for login history page)
    await logActivity({
      userId: user.id,
      action: 'LOGIN',
      ip,
      userAgent: device,
      details: { method: 'password' },
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
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
