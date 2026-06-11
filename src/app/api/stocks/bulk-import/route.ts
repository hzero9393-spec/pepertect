import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { stocks } = body as {
      stocks: Array<{
        symbol: string
        name: string
        sector: string
        currentPrice: number
        marketCap: number
        isin: string | null
        lotSize: number
        isFuturesAvailable: boolean
        isOptionsAvailable: boolean
      }>
    }

    if (!Array.isArray(stocks) || stocks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No stocks provided' },
        { status: 400 }
      )
    }

    let upserted = 0
    let errors = 0

    for (const stock of stocks) {
      try {
        await db.stock.upsert({
          where: { symbol: stock.symbol },
          update: {
            name: stock.name,
            sector: stock.sector,
            currentPrice: stock.currentPrice,
            marketCap: stock.marketCap,
            isin: stock.isin,
            lotSize: stock.lotSize,
            isFuturesAvailable: stock.isFuturesAvailable,
            isOptionsAvailable: stock.isOptionsAvailable,
            isActive: true,
          },
          create: {
            symbol: stock.symbol,
            name: stock.name,
            sector: stock.sector,
            currentPrice: stock.currentPrice,
            marketCap: stock.marketCap,
            isin: stock.isin,
            lotSize: stock.lotSize,
            isFuturesAvailable: stock.isFuturesAvailable,
            isOptionsAvailable: stock.isOptionsAvailable,
            exchange: 'NSE',
            circuitLimit: 20,
            strikeInterval:
              Math.round(stock.currentPrice / 50) * 5 || 10,
            isActive: true,
          },
        })
        upserted++
      } catch {
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      upserted,
      errors,
      total: stocks.length,
    })
  } catch (error) {
    console.error('[API /stocks/bulk-import] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to import stocks' },
      { status: 500 }
    )
  }
}
