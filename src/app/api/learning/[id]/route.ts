import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const path = await db.learningPath.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            progress: { where: { userId: auth.userId } },
          },
        },
      },
    });

    if (!path) {
      return NextResponse.json({ success: false, error: 'Learning path not found' }, { status: 404 });
    }

    const modulesWithProgress = path.modules.map((m) => ({
      ...m,
      status: m.progress[0]?.status || 'NOT_STARTED',
      score: m.progress[0]?.score ?? null,
      completedAt: m.progress[0]?.completedAt ?? null,
    }));

    return NextResponse.json({ success: true, data: { ...path, modules: modulesWithProgress } });
  } catch (error) {
    console.error('Fetch learning path error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch learning path' }, { status: 500 });
  }
}
