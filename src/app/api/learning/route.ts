import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const learningPaths = await db.learningPath.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        modules: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: learningPaths,
    })
  } catch (error) {
    console.error('[API /learning] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch learning paths' },
      { status: 500 }
    )
  }
}
