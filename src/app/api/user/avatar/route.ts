import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/user/avatar
 * Body: { avatar: "data:image/png;base64,..." }
 *   — accepts data URL up to ~500KB
 *   — accepts any image URL (https://) up to 2048 chars
 *
 * Stores the avatar on the User.avatar column. Returns the new avatar URL.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { avatar } = body;

    if (!avatar || typeof avatar !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Avatar data is required' },
        { status: 400 }
      );
    }

    // Accept either a data: URL (base64) or a plain https URL.
    const isDataUrl = avatar.startsWith('data:image/');
    const isHttpUrl = avatar.startsWith('https://');

    if (!isDataUrl && !isHttpUrl) {
      return NextResponse.json(
        { success: false, error: 'Avatar must be a data URL or https URL' },
        { status: 400 }
      );
    }

    if (isDataUrl && avatar.length > 700_000) {
      return NextResponse.json(
        { success: false, error: 'Avatar image is too large (max ~500KB). Please use a smaller image.' },
        { status: 400 }
      );
    }
    if (isHttpUrl && avatar.length > 2048) {
      return NextResponse.json(
        { success: false, error: 'Avatar URL is too long' },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: auth.userId },
      data: { avatar },
    });

    await logActivity({
      userId: auth.userId,
      action: 'AVATAR_UPDATE',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
    });

    return NextResponse.json({
      success: true,
      data: { avatar },
      message: 'Profile picture updated',
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/avatar
 * Removes the user's avatar.
 */
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await db.user.update({
      where: { id: auth.userId },
      data: { avatar: null },
    });
    return NextResponse.json({
      success: true,
      message: 'Profile picture removed',
    });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove avatar' },
      { status: 500 }
    );
  }
}
