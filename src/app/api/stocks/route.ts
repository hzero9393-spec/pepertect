import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getUpstoxTopStockQuotes, NSE_EQ_INSTRUMENT_MAP } from '@/lib/upstox-api'

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

    // Try to enrich with Upstox real-time data
    if (isUpstoxAuthenticated() && !search && !sector) {
      try {
        const upstoxQuotes = await getUpstoxTopStockQuotes(50)

        if (upstoxQuotes.length > 0) {
          // Create a map of instrument_key -> quote
          const quoteMap = new Map<string, typeof upstoxQuotes[0]>()
          for (const quote of upstoxQuotes) {
            quoteMap.set(quote.instrument_token, quote)
          }

          // Merge Upstox data with DB data
          const enrichedStocks = stocks.map(stock => {
            const instrumentKey = NSE_EQ_INSTRUMENT_MAP[stock.symbol]
            const quote = instrumentKey ? quoteMap.get(instrumentKey) : undefined

            if (quote && quote.ltp > 0) {
              return {
                ...stock,
                currentPrice: quote.ltp,
                open: quote.open,
                high: quote.high,
                low: quote.low,
                previousClose: quote.previous_close,
                change: quote.change,
                changePercent: quote.change_percent,
                volume: quote.volume,
                lastUpdated: new Date(),
                isRealData: true,
                dataSource: 'upstox',
              }
            }
            return { ...stock, isRealData: false, dataSource: 'database' }
          })

          return NextResponse.json({
            success: true,
            data: enrichedStocks,
            count: enrichedStocks.length,
          })
        }
      } catch (err) {
        console.warn('[API /stocks] Upstox fetch failed, using DB data:', err)
      }
    }

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
