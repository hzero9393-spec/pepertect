import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Get top gainers from DB (sorted by changePercent desc)
    // Note: For real-time data, the /api/stocks endpoint updates prices from Upstox
    // The DB values get updated on page load. For now, we sort by DB data.
    const gainers = await db.stock.findMany({
      where: {
        isActive: true,
        changePercent: { gt: 0 },
      },
      orderBy: { changePercent: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      data: gainers,
    })
  } catch (error) {
    console.error('[API /stocks/gainers] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch top gainers' },
      { status: 500 }
    )
  }
}
