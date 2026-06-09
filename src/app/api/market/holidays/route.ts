import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const currentYear = new Date().getFullYear()
    const yearStart = new Date(`${currentYear}-01-01`)
    const yearEnd = new Date(`${currentYear}-12-31`)

    const holidays = await db.marketHoliday.findMany({
      where: {
        date: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: holidays,
      year: currentYear,
    })
  } catch (error) {
    console.error('[API /market/holidays] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market holidays' },
      { status: 500 }
    )
  }
}
