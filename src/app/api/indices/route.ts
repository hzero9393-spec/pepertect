import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getUpstoxIndexQuotesMap } from '@/lib/upstox-api'
import { cache, CacheTTL } from '@/lib/cache'

// Force dynamic - no caching at Next.js level
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Cache key for the full indices response
const INDICES_RESPONSE_CACHE_KEY = 'api:indices:response'

export async function GET() {
  try {
    // Check server-side cache first (1s TTL for real-time feel with fast response)
    const cached = cache.get<{
      success: boolean
      data: unknown[]
      realDataCount: number
    }>(INDICES_RESPONSE_CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached)
    }

    // 1. Get base data from database
    const indices = await db.index.findMany({
      where: { isEnabled: true },
      orderBy: { symbol: 'asc' },
    })

    // 2. Try to get real-time quotes from Upstox
    let upstoxMap: Record<string, { last_price: number; net_change: number; ohlc: { open: number; high: number; low: number; close: number }; volume: number | null }> = {}

    if (await isUpstoxAuthenticated()) {
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

    // 4. Update DB with real-time index prices (async, non-blocking, throttled to 5s)
    // Don't write to DB on every 1s poll - only every 5 seconds
    const lastDbUpdate = cache.get<number>('api:indices:lastDbUpdate')
    if (realCount > 0 && (!lastDbUpdate || Date.now() - lastDbUpdate > 5000)) {
      cache.set('api:indices:lastDbUpdate', Date.now(), 10000)
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

    const response = {
      success: true,
      data: merged,
      realDataCount: realCount,
    }

    // Cache the response for 1s to handle rapid polling efficiently
    cache.set(INDICES_RESPONSE_CACHE_KEY, response, CacheTTL.STOCK_PRICE)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API /indices] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch indices' },
      { status: 500 }
    )
  }
}
