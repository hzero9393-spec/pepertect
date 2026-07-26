import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const notifications = await db.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = await db.notification.count({
      where: { userId: auth.userId, isRead: false },
    });

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { title, message, type } = await req.json();

    const notification = await db.notification.create({
      data: {
        userId: auth.userId,
        type: type || 'SYSTEM',
        title,
        message,
      },
    });

    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 });
  }
}
