import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getUpstoxAllIndexQuotes, NSE_INDEX_INSTRUMENT_MAP } from '@/lib/upstox-api'

export async function GET() {
  try {
    // Get base data from database
    const indices = await db.index.findMany({
      where: { isEnabled: true },
      orderBy: { symbol: 'asc' },
    })

    // Try to enrich with Upstox real-time data
    if (isUpstoxAuthenticated()) {
      try {
        const upstoxQuotes = await getUpstoxAllIndexQuotes()

        if (upstoxQuotes.length > 0) {
          // Create a map of symbol -> quote
          const quoteMap = new Map<string, typeof upstoxQuotes[0]>()

          for (const quote of upstoxQuotes) {
            // Find which index symbol this quote belongs to
            for (const [sym, instrumentKey] of Object.entries(NSE_INDEX_INSTRUMENT_MAP)) {
              if (quote.instrument_token === instrumentKey) {
                quoteMap.set(sym, quote)
                break
              }
            }
          }

          // Merge Upstox data with DB data
          const enrichedIndices = indices.map(idx => {
            const quote = quoteMap.get(idx.symbol)
            if (quote && quote.ltp > 0) {
              return {
                ...idx,
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
            return { ...idx, isRealData: false, dataSource: 'database' }
          })

          return NextResponse.json({
            success: true,
            data: enrichedIndices,
          })
        }
      } catch (err) {
        console.warn('[API /indices] Upstox fetch failed, using DB data:', err)
      }
    }

    return NextResponse.json({
      success: true,
      data: indices.map(idx => ({ ...idx, isRealData: false, dataSource: 'database' })),
    })
  } catch (error) {
    console.error('[API /indices] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch indices' },
      { status: 500 }
    )
  }
}
