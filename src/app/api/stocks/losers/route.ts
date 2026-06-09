import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const losers = await db.stock.findMany({
      where: {
        isActive: true,
        changePercent: { lt: 0 },
      },
      orderBy: { changePercent: 'asc' },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      data: losers,
    })
  } catch (error) {
    console.error('[API /stocks/losers] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch top losers' },
      { status: 500 }
    )
  }
}
