import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const challenges = await db.challenge.findMany({
      where: {
        status: { in: ['ACTIVE', 'UPCOMING'] },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
      include: {
        _count: {
          select: { participations: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: challenges,
    })
  } catch (error) {
    console.error('[API /challenges] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch challenges' },
      { status: 500 }
    )
  }
}
