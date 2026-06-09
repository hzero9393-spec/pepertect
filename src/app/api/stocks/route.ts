import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const sector = searchParams.get('sector')
    const fnoOnly = searchParams.get('fnoOnly')

    const where: Record<string, unknown> = { isActive: true }

    if (search) {
      where.OR = [
        { symbol: { contains: search } },
        { name: { contains: search } },
      ]
    }

    if (sector) {
      where.sector = sector
    }

    if (fnoOnly === 'true') {
      where.isFuturesAvailable = true
      where.isOptionsAvailable = true
    }

    const stocks = await db.stock.findMany({
      where,
      orderBy: { marketCap: 'desc' },
    })

    // Stock list returns DB data; individual stock detail uses Upstox real-time
    return NextResponse.json({
      success: true,
      data: stocks.map(s => ({ ...s, isRealData: false, dataSource: 'database' })),
      count: stocks.length,
    })
  } catch (error) {
    console.error('[API /stocks] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stocks' },
      { status: 500 }
    )
  }
}
