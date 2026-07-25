import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { FREE_VIRTUAL_CAPITAL } from '@/lib/tier';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role: 'USER',
        tier: 'FREE',
        virtualCapital: FREE_VIRTUAL_CAPITAL,
      },
    });

    // Create portfolio for the user
    await db.portfolio.create({
      data: {
        userId: user.id,
        totalBalance: FREE_VIRTUAL_CAPITAL,
        availableMargin: FREE_VIRTUAL_CAPITAL,
      },
    });

    // Generate JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: 'USER',
      tier: 'FREE',
    });

    // Create session
    const expiresAt = new Date(Date.now() + JWT_EXPIRES_MS);
    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Return user without passwordHash
    const { passwordHash: _ph, ...safeUser } = user;

    return NextResponse.json(
      {
        success: true,
        user: {
          ...safeUser,
          virtualCapital: Number(safeUser.virtualCapital),
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
