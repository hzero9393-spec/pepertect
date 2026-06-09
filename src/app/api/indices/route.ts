import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getUpstoxIndexQuotesMap } from '@/lib/upstox-api'

export async function GET() {
  try {
    // 1. Get base data from database
    const indices = await db.index.findMany({
      where: { isEnabled: true },
      orderBy: { symbol: 'asc' },
    })

    // 2. Try to get real-time quotes from Upstox
    let upstoxMap: Record<string, { last_price: number; net_change: number; ohlc: { open: number; high: number; low: number; close: number }; volume: number | null }> = {}

    if (isUpstoxAuthenticated()) {
      try {
        const symbols = indices.map(idx => idx.symbol)
        upstoxMap = await getUpstoxIndexQuotesMap(symbols)
      } catch (err) {
        console.warn('[API /indices] Upstox quotes failed, using DB data:', err)
      }
    }

    // 3. Merge DB data with Upstox real-time data AND update DB
    const realCount = Object.keys(upstoxMap).length
    const merged = indices.map(idx => {
      const rt = upstoxMap[idx.symbol]
      if (rt && rt.last_price > 0) {
        const previousClose = rt.ohlc.close - rt.net_change
        const changePercent = previousClose > 0 ? (rt.net_change / previousClose) * 100 : 0
        return {
          ...idx,
          currentPrice: rt.last_price,
          change: rt.net_change,
          changePercent: Math.round(changePercent * 100) / 100,
          open: rt.ohlc.open,
          high: rt.ohlc.high,
          low: rt.ohlc.low,
          previousClose,
          volume: rt.volume || idx.volume,
          isRealData: true,
          dataSource: 'upstox',
        }
      }
      return { ...idx, isRealData: false, dataSource: 'database' }
    })

    // 4. Update DB with real-time index prices (async, non-blocking)
    if (realCount > 0) {
      Promise.allSettled(
        Object.entries(upstoxMap).map(([symbol, rt]) =>
          db.index.update({
            where: { symbol },
            data: {
              currentPrice: rt.last_price,
              change: rt.net_change,
              high: rt.ohlc.high,
              low: rt.ohlc.low,
              open: rt.ohlc.open,
              lastUpdated: new Date(),
            },
          }).catch(() => {})
        )
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      data: merged,
      realDataCount: realCount,
    })
  } catch (error) {
    console.error('[API /indices] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch indices' },
      { status: 500 }
    )
  }
}
