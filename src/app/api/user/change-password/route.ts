import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, passwordHash: true, googleId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.passwordHash) {
      if (user.googleId) {
        return NextResponse.json(
          { success: false, error: 'Google-linked accounts don\'t use a password. Set a password from Profile.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'No password set for this account' },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: auth.userId },
      data: { passwordHash: newHash },
    });

    await logActivity({
      userId: auth.userId,
      action: 'PASSWORD_CHANGE',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      details: { at: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
