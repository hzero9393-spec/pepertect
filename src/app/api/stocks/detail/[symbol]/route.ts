import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchStockOverviewData } from '@/lib/dhan-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()

    // Get stock from database
    const dbStock = await db.stock.findUnique({
      where: { symbol: symbolUpper },
    })

    // Use comprehensive data fetcher (Dhan → Yahoo → DB fallback)
    const stockData = await fetchStockOverviewData(symbolUpper, dbStock as Record<string, unknown> | null)

    // Get similar stocks from the same sector
    let similarStocks: Array<{
      symbol: string; name: string; currentPrice: number; change: number; changePercent: number; sector: string
    }> = []

    if (stockData.sector) {
      similarStocks = await db.stock.findMany({
        where: {
          sector: stockData.sector,
          symbol: { not: symbolUpper },
          isActive: true,
        },
        select: {
          symbol: true,
          name: true,
          currentPrice: true,
          change: true,
          changePercent: true,
          sector: true,
        },
        orderBy: { marketCap: 'desc' },
        take: 8,
      })
    }

    return NextResponse.json({
      success: true,
      data: stockData,
      similarStocks,
    })
  } catch (error) {
    console.error(`[API /stocks/detail] Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock detail' },
      { status: 500 }
    )
  }
}
