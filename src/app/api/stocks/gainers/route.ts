import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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
