import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, JWTPayload } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * POST /api/auth/supabase-session
 *
 * Called after the client verifies the Supabase OTP session.
 * The client sends the Supabase access_token in the Authorization header.
 * We:
 *  1. Verify it with Supabase (server-side) to get the user's email
 *  2. Upsert a User row in our PostgreSQL (creates on first login)
 *  3. Issue our own JWT for API auth
 *  4. Return our user object + token so the client can populate the Zustand store
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!supabaseToken) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase token' },
        { status: 401 }
      );
    }

    // Verify the Supabase token by calling Supabase's auth API using admin client
    const { supabaseAdmin: admin } = await import('@/lib/supabase');
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin not configured' },
        { status: 500 }
      );
    }

    const { data: { user: supabaseUser }, error: authError } = await admin.auth.getUser(supabaseToken);

    if (authError || !supabaseUser?.email) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired Supabase session' },
        { status: 401 }
      );
    }

    const email = supabaseUser.email.toLowerCase();

    // Upsert user in our database
    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // First-time login — create the user
      user = await db.user.create({
        data: {
          email,
          name: supabaseUser.user_metadata?.name || email.split('@')[0],
          avatar: supabaseUser.user_metadata?.avatar_url || null,
          role: 'USER',
          tier: 'FREE',
          virtualCapital: 100000,
          isActive: true,
          passwordHash: null, // OTP users have no password
        },
      });
    } else {
      // Update name/avatar from Supabase metadata if we have them
      const updates: Record<string, unknown> = {};
      if (supabaseUser.user_metadata?.name && supabaseUser.user_metadata.name !== user.name) {
        updates.name = supabaseUser.user_metadata.name;
      }
      if (supabaseUser.user_metadata?.avatar_url && supabaseUser.user_metadata.avatar_url !== user.avatar) {
        updates.avatar = supabaseUser.user_metadata.avatar_url;
      }
      if (Object.keys(updates).length > 0) {
        user = await db.user.update({ where: { email }, data: updates });
      }
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // Generate our JWT
    const jwtPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role as 'USER' | 'ADMIN',
      tier: user.tier as 'FREE' | 'PREMIUM',
    };
    const token = signToken(jwtPayload);

    // Create session
    const device = req.headers.get('user-agent') || 'Unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';
    const expiresAt = new Date(Date.now() + JWT_EXPIRES_MS);

    await db.session.create({
      data: { userId: user.id, token, device, ip, expiresAt },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      action: 'LOGIN',
      ip,
      userAgent: device,
      details: { method: 'otp' },
    });

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
    console.error('Supabase session error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
