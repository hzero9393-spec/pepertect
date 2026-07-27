import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const logs = await db.activityLog.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('Fetch activity logs error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { action, details } = await req.json();
    const ip = req.headers.get('x-forwarded-for') || null;
    const userAgent = req.headers.get('user-agent') || null;

    const log = await db.activityLog.create({
      data: { userId: auth.userId, action, details: details ? JSON.stringify(details) : null, ip, userAgent: userAgent || null },
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    console.error('Log activity error:', error);
    return NextResponse.json({ success: false, error: 'Failed to log activity' }, { status: 500 });
  }
}
