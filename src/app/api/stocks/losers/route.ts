import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Get top losers from DB (sorted by changePercent asc)
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
