import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const { moduleId, answers, score } = await req.json();

    // Upsert progress
    const progress = await db.userProgress.upsert({
      where: { userId_moduleId: { userId: auth.userId, moduleId } },
      update: { status: 'COMPLETED', score, completedAt: new Date() },
      create: { userId: auth.userId, moduleId, status: 'COMPLETED', score, completedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: progress });
  } catch (error) {
    console.error('Save progress error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save progress' }, { status: 500 });
  }
}
