import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    await db.notification.update({
      where: { id, userId: auth.userId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 });
  }
}
