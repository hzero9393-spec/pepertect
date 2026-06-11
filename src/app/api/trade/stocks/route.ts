import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const sector = searchParams.get('sector')

    // Build where clause
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

    const stocks = await db.stock.findMany({
      where,
      orderBy: { marketCap: 'desc' },
      select: {
        id: true,
        symbol: true,
        name: true,
        currentPrice: true,
        change: true,
        changePercent: true,
        sector: true,
        lotSize: true,
        isFnoBan: true,
        isFuturesAvailable: true,
        isOptionsAvailable: true,
        volume: true,
        marketCap: true,
        week52High: true,
        week52Low: true,
        peRatio: true,
      }
    })

    // Format for trading interface
    const tradeableStocks = stocks.map(stock => ({
      id: stock.id,
      symbol: stock.symbol,
      name: stock.name,
      currentPrice: stock.currentPrice,
      change: stock.change,
      changePercent: stock.changePercent,
      sector: stock.sector,
      lotSize: stock.lotSize,
      isFnoBan: stock.isFnoBan,
      isFuturesAvailable: stock.isFuturesAvailable,
      isOptionsAvailable: stock.isOptionsAvailable,
      volume: stock.volume,
      marketCap: stock.marketCap,
      week52High: stock.week52High,
      week52Low: stock.week52Low,
      peRatio: stock.peRatio,
    }))

    return NextResponse.json({
      success: true,
      data: tradeableStocks,
      count: tradeableStocks.length,
    })
  } catch (error) {
    console.error('[GET /api/trade/stocks] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tradeable stocks' },
      { status: 500 }
    )
  }
}
