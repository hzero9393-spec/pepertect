import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const sectors = await db.sector.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: sectors,
    })
  } catch (error) {
    console.error('[API /sectors] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sectors' },
      { status: 500 }
    )
  }
}
