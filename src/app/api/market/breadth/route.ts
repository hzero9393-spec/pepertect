import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const breadth = await db.marketBreadth.findFirst({
      orderBy: { date: 'desc' },
    })

    if (!breadth) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No market breadth data available',
      })
    }

    return NextResponse.json({
      success: true,
      data: breadth,
    })
  } catch (error) {
    console.error('[API /market/breadth] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market breadth' },
      { status: 500 }
    )
  }
}
