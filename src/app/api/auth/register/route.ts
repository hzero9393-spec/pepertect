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
    const acceptedTerms = body.acceptedTerms === true;
    const acceptedPrivacy = body.acceptedPrivacy === true;

    /* Enforce legal acceptance before account creation.
       This is a server-side guard — the client UI also disables the submit
       button until both checkboxes are ticked, but we double-check here to
       prevent bypassing the UI. */
    if (!acceptedTerms || !acceptedPrivacy) {
      return NextResponse.json(
        {
          success: false,
          error:
            'You must accept the Terms & Conditions and Privacy Policy to create an account',
        },
        { status: 400 }
      );
    }

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
        /* Store legal acceptance timestamps in notifSettings (JSON field).
           This avoids a schema migration while still recording consent. */
        notifSettings: {
          legalAcceptance: {
            terms: { accepted: true, at: new Date().toISOString() },
            privacy: { accepted: true, at: new Date().toISOString() },
            version: '2026-07-26',
          },
        },
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
