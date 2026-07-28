import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

/**
 * DELETE /api/notifications/delete-all
 * Delete ALL notifications for the authenticated user
 */
export async function DELETE(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Delete all notifications for this user
    await db.notification.deleteMany({
      where: { userId: auth.userId },
    });

    return NextResponse.json({
      success: true,
      message: 'All notifications deleted',
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
