import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    let sub = await db.subscription.findFirst({
      where: { userId: auth.userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      sub = await db.subscription.create({
        data: { userId: auth.userId, plan: 'FREE', status: 'ACTIVE' },
      });
    }

    return NextResponse.json({ success: true, data: sub });
  } catch (error) {
    console.error('Fetch subscription error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
