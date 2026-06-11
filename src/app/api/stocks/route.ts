import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, NSE_EQ_INSTRUMENT_MAP, ensureValidToken } from '@/lib/upstox-api'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'

// Force dynamic - no caching at Next.js level
export const dynamic = 'force-dynamic'
export const revalidate = 0

const UPSTOX_BASE_URL = 'https://api.upstox.com'
const UPSTOX_API_V2 = `${UPSTOX_BASE_URL}/v2`

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const sector = searchParams.get('sector')
    const fnoOnly = searchParams.get('fnoOnly')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build cache key that includes pagination params
    const cacheKey = `api:stocks:${search || ''}:${sector || ''}:${fnoOnly || ''}:${page}:${limit}`

    // Check server-side cache first (1s TTL)
    const cached = cache.get<{
      success: boolean
      data: unknown[]
      count: number
      total: number
      page: number
      limit: number
      realDataCount: number
    }>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

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

    // Get total count for pagination
    const total = await db.stock.count({ where })

    // 1. Get paginated stock data from database
    const stocks = await db.stock.findMany({
      where,
      orderBy: { marketCap: 'desc' },
      skip,
      take: limit,
    })

    // 2. Try to get real-time quotes from Upstox ONLY for the current page stocks
    let upstoxMap: Record<string, { last_price: number; net_change: number; ohlc: { open: number; high: number; low: number; close: number }; volume: number | null }> = {}

    if (await isUpstoxAuthenticated()) {
      try {
        const token = (await ensureValidToken())!
        // Only fetch quotes for stocks on this page that have instrument key mappings
        const mappedSymbols = stocks.filter(s => s.symbol in NSE_EQ_INSTRUMENT_MAP).map(s => s.symbol)
        const instrumentKeys = mappedSymbols.map(s => NSE_EQ_INSTRUMENT_MAP[s])

        if (instrumentKeys.length > 0) {
          // Batch in groups of 30 to avoid URL length limits
          const BATCH_SIZE = 30
          for (let i = 0; i < instrumentKeys.length; i += BATCH_SIZE) {
            const batchKeys = instrumentKeys.slice(i, i + BATCH_SIZE)
            const batchSymbols = mappedSymbols.slice(i, i + BATCH_SIZE)

            const encodedKeys = batchKeys.map(k => encodeURIComponent(k)).join(',')
            const res = await fetch(
              `${UPSTOX_API_V2}/market-quote/quotes?instrument_key=${encodedKeys}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json',
                },
                cache: 'no-store',
                signal: AbortSignal.timeout(15000),
              }
            )

            if (res.ok) {
              const data = await res.json()
              if (data?.data) {
                for (const symbol of batchSymbols) {
                  const segment = NSE_EQ_INSTRUMENT_MAP[symbol].split('|')[0]
                  const possibleKeys = [
                    `${segment}:${symbol}`,
                    NSE_EQ_INSTRUMENT_MAP[symbol].replace('|', ':'),
                    NSE_EQ_INSTRUMENT_MAP[symbol],
                  ]
                  for (const key of possibleKeys) {
                    if (data.data[key]) {
                      const q = data.data[key]
                      upstoxMap[symbol] = {
                        last_price: q.last_price,
                        net_change: q.net_change,
                        ohlc: q.ohlc,
                        volume: q.volume,
                      }
                      break
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[API /stocks] Upstox quotes failed:', err)
      }
    }

    // 3. Merge DB data with Upstox real-time data
    const realCount = Object.keys(upstoxMap).length
    const merged = stocks.map(s => {
      const rt = upstoxMap[s.symbol]
      if (rt && rt.last_price > 0) {
        const previousClose = rt.ohlc.close - rt.net_change
        const changePercent = previousClose > 0 ? (rt.net_change / previousClose) * 100 : 0
        return {
          ...s,
          currentPrice: rt.last_price,
          change: rt.net_change,
          changePercent: Math.round(changePercent * 100) / 100,
          open: rt.ohlc.open,
          high: rt.ohlc.high,
          low: rt.ohlc.low,
          previousClose,
          volume: rt.volume || s.volume,
          isRealData: true,
          dataSource: 'upstox',
        }
      }
      return { ...s, isRealData: false, dataSource: 'database' }
    })

    // 4. Update DB with real-time prices (async, non-blocking) for gainers/losers
    if (realCount > 0) {
      Promise.allSettled(
        Object.entries(upstoxMap).map(([symbol, rt]) => {
          const previousClose = rt.ohlc.close - rt.net_change
          const changePercent = previousClose > 0 ? (rt.net_change / previousClose) * 100 : 0
          return db.stock.update({
            where: { symbol },
            data: {
              currentPrice: rt.last_price,
              change: rt.net_change,
              changePercent: Math.round(changePercent * 100) / 100,
              open: rt.ohlc.open,
              high: rt.ohlc.high,
              low: rt.ohlc.low,
              previousClose,
              volume: rt.volume,
              lastUpdated: new Date(),
            },
          }).catch(() => {})
        })
      ).catch(() => {})
    }

    const response = {
      success: true,
      data: merged,
      count: merged.length,
      total,
      page,
      limit,
      realDataCount: realCount,
    }

    // Cache the response for 1s
    cache.set(cacheKey, response, CacheTTL.STOCK_PRICE)

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API /stocks] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stocks' },
      { status: 500 }
    )
  }
}
