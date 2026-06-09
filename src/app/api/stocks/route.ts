import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, NSE_EQ_INSTRUMENT_MAP } from '@/lib/upstox-api'

const UPSTOX_BASE_URL = 'https://api.upstox.com'
const UPSTOX_API_V2 = `${UPSTOX_BASE_URL}/v2`

function getAccessToken(): string | null {
  return process.env.UPSTOX_ACCESS_TOKEN || null
}

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

    // 1. Get base stock data from database
    const stocks = await db.stock.findMany({
      where,
      orderBy: { marketCap: 'desc' },
    })

    // 2. Try to get real-time quotes from Upstox in a SINGLE batch call
    let upstoxMap: Record<string, { last_price: number; net_change: number; ohlc: { open: number; high: number; low: number; close: number }; volume: number | null }> = {}

    if (isUpstoxAuthenticated()) {
      try {
        const token = getAccessToken()!
        // Only fetch quotes for stocks that have a mapping
        const mappedSymbols = stocks.filter(s => s.symbol in NSE_EQ_INSTRUMENT_MAP).map(s => s.symbol)
        const instrumentKeys = mappedSymbols.map(s => NSE_EQ_INSTRUMENT_MAP[s])

        if (instrumentKeys.length > 0) {
          const encodedKeys = instrumentKeys.map(k => encodeURIComponent(k)).join(',')
          const res = await fetch(
            `${UPSTOX_API_V2}/market-quote/quotes?instrument_key=${encodedKeys}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
              next: { revalidate: 30 },
              signal: AbortSignal.timeout(15000),
            }
          )

          if (res.ok) {
            const data = await res.json()
            if (data?.data) {
              // Match response keys to our symbols
              for (const symbol of mappedSymbols) {
                const segment = NSE_EQ_INSTRUMENT_MAP[symbol].split('|')[0]
                const possibleKeys = [
                  `${segment}:${symbol}`,                    // NSE_EQ:RELIANCE
                  NSE_EQ_INSTRUMENT_MAP[symbol].replace('|', ':'), // NSE_EQ:INE002A01018
                  NSE_EQ_INSTRUMENT_MAP[symbol],             // NSE_EQ|INE002A01018
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
      } catch (err) {
        console.warn('[API /stocks] Upstox quotes failed:', err)
      }
    }

    // 3. Merge DB data with Upstox real-time data AND update DB
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
      // Fire and forget - don't await
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
          }).catch(() => {}) // Silently ignore individual update errors
        })
      ).catch(() => {}) // Silently ignore overall errors
    }

    return NextResponse.json({
      success: true,
      data: merged,
      count: merged.length,
      realDataCount: realCount,
    })
  } catch (error) {
    console.error('[API /stocks] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stocks' },
      { status: 500 }
    )
  }
}
