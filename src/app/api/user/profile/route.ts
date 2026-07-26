import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, name: true, avatar: true, phone: true, role: true, tier: true, virtualCapital: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...user, virtualCapital: Number(user.virtualCapital) },
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { name, phone, avatar } = await req.json();
    const user = await db.user.update({
      where: { id: auth.userId },
      data: { name, phone, avatar },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
  }
}
