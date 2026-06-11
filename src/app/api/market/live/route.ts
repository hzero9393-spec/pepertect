import { NextResponse } from 'next/server'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'
import { isUpstoxAuthenticated, getUpstoxIndexQuotesMap, getUpstoxStockQuotesMap } from '@/lib/upstox-api'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

// In-flight fetch promise for concurrent request deduplication
let inFlightFetch: Promise<void> | null = null
// Track last fetch time to avoid hammering Upstox API
let lastFetchTime = 0
// Rate limit backoff - increases when we get 429s
let rateLimitBackoff = 0
const MIN_FETCH_INTERVAL = 1500 // Minimum 1.5s between Upstox API calls
const BACKOFF_MAX = 10000 // Max backoff of 10s

interface LiveMarketData {
  indices: Record<string, {
    last_price: number
    net_change: number
    ohlc: { open: number; high: number; low: number; close: number }
    volume: number | null
  }>
  stocks: Record<string, {
    last_price: number
    net_change: number
    ohlc: { open: number; high: number; low: number; close: number }
    volume: number | null
    oi: number | null
  }>
  timestamp: number
  source?: string
}

// Database fallback - fetch from Turso when Upstox is slow/unavailable
async function fetchDatabaseFallback(): Promise<LiveMarketData | null> {
  try {
    const { db } = await import('@/lib/db')

    // Fetch indices from database
    const dbIndices = await db.index.findMany({ where: { isEnabled: true } })
    const indices: LiveMarketData['indices'] = {}
    for (const idx of dbIndices) {
      indices[idx.symbol] = {
        last_price: idx.currentPrice,
        net_change: idx.change,
        ohlc: {
          open: idx.open || idx.currentPrice,
          high: idx.high || idx.currentPrice,
          low: idx.low || idx.currentPrice,
          close: idx.previousClose || idx.currentPrice,
        },
        volume: idx.volume,
      }
    }

    // Fetch stocks from database
    const dbStocks = await db.stock.findMany({
      where: { isActive: true },
      take: 100,
      orderBy: { marketCap: 'desc' },
    })
    const stocks: LiveMarketData['stocks'] = {}
    for (const stock of dbStocks) {
      stocks[stock.symbol] = {
        last_price: stock.currentPrice,
        net_change: stock.change,
        ohlc: {
          open: stock.open || stock.currentPrice,
          high: stock.high || stock.currentPrice,
          low: stock.low || stock.currentPrice,
          close: stock.previousClose || stock.currentPrice,
        },
        volume: stock.volume,
        oi: null,
      }
    }

    if (Object.keys(indices).length > 0 || Object.keys(stocks).length > 0) {
      return { indices, stocks, timestamp: Date.now(), source: 'database' }
    }
  } catch (err) {
    console.warn('[Market Live] Database fallback error:', err)
  }
  return null
}

async function fetchLiveData(): Promise<void> {
  // Rate limit: enforce minimum interval between Upstox API calls
  const now = Date.now()
  const timeSinceLastFetch = now - lastFetchTime
  const effectiveInterval = MIN_FETCH_INTERVAL + rateLimitBackoff

  if (timeSinceLastFetch < effectiveInterval) {
    // Too soon - skip this fetch, let cached data serve
    return
  }

  try {
    lastFetchTime = now

    // Check if authenticated, with a short timeout
    const authCheck = await Promise.race([
      isUpstoxAuthenticated(),
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), 3000)),
    ])

    if (!authCheck) return

    // Fetch with timeout protection
    const [indexMap, stockMap] = await Promise.race([
      Promise.all([
        getUpstoxIndexQuotesMap(),
        getUpstoxStockQuotesMap([
          // NIFTY 50 (full list)
          'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
          'HINDUNILVR', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK',
          'LT', 'AXISBANK', 'BAJFINANCE', 'ASIANPAINT', 'MARUTI',
          'SUNPHARMA', 'TATAMOTORS', 'WIPRO', 'HCLTECH', 'ULTRACEMCO',
          'TITAN', 'NESTLEIND', 'NTPC', 'POWERGRID', 'ONGC',
          'TATASTEEL', 'ADANIENT', 'ADANIPORTS', 'JSWSTEEL', 'COALINDIA',
          'BPCL', 'HINDALCO', 'GRASIM', 'TECHM', 'BAJAJFINSV',
          'DRREDDY', 'CIPLA', 'EICHERMOT', 'TATACONSUM', 'HEROMOTOCO',
          'M&M', 'APOLLOHOSP', 'DIVISLAB', 'BRITANNIA', 'INDUSINDBK',
          'HDFCLIFE', 'SBILIFE', 'TATAMTRDVR',
          // Extra F&O popular stocks
          'YESBANK', 'PNB', 'BANKBARODA', 'IDFCFIRSTB',
          'SHRIRAMFIN', 'CHOLAFIN', 'SUZLON', 'ADANIPOWER',
          'HAL', 'DMART', 'TRENT', 'VEDL', 'SAIL', 'NMDC',
          'IDEA', 'OIL', 'GAIL', 'IOC', 'PETRONET',
        ]),
      ]),
      new Promise<[Record<string, never>, Record<string, never>]>(resolve =>
        setTimeout(() => resolve([{}, {}]), 8000)
      ),
    ])

    // Transform index data
    const indices: LiveMarketData['indices'] = {}
    for (const [symbol, quote] of Object.entries(indexMap)) {
      indices[symbol] = {
        last_price: quote.last_price,
        net_change: quote.net_change,
        ohlc: quote.ohlc,
        volume: quote.volume,
      }
    }

    // Transform stock data
    const stocks: LiveMarketData['stocks'] = {}
    for (const [symbol, quote] of Object.entries(stockMap)) {
      stocks[symbol] = {
        last_price: quote.last_price,
        net_change: quote.net_change,
        ohlc: quote.ohlc,
        volume: quote.volume,
        oi: quote.oi,
      }
    }

    // Only cache if we got actual data
    if (Object.keys(indices).length > 0 || Object.keys(stocks).length > 0) {
      cache.set(
        CacheKeys.marketLive(),
        { indices, stocks, timestamp: Date.now(), source: 'upstox' },
        CacheTTL.MARKET_LIVE
      )
      // Successful fetch - reduce backoff
      rateLimitBackoff = Math.max(0, rateLimitBackoff - 500)
    }
  } catch (_err) {
    // Increase backoff on error (likely rate limit)
    rateLimitBackoff = Math.min(BACKOFF_MAX, rateLimitBackoff + 1000)
    // Silently handle - database fallback will be used
  }
}

export async function GET() {
  const cached = cache.get<LiveMarketData>(CacheKeys.marketLive())

  // If cached data is fresh (within TTL), return immediately
  if (cached) {
    const age = Date.now() - cached.timestamp
    if (age < CacheTTL.MARKET_LIVE) {
      return NextResponse.json({
        success: true,
        data: cached,
        freshness: age,
      })
    }
    // Stale but available - return it while fetching fresh data in background
    // Start a non-blocking refresh (respects rate limiting)
    if (!inFlightFetch) {
      inFlightFetch = fetchLiveData().finally(() => {
        inFlightFetch = null
      })
    }
    return NextResponse.json({
      success: true,
      data: cached,
      freshness: age,
    })
  }

  // No cached data — try Upstox first, with a timeout
  try {
    if (!inFlightFetch) {
      inFlightFetch = fetchLiveData().finally(() => {
        inFlightFetch = null
      })
    }

    // Wait for Upstox with a 5-second timeout
    await Promise.race([
      inFlightFetch,
      new Promise<void>(resolve => setTimeout(resolve, 5000)),
    ])
  } catch {
    // Continue to fallback
  }

  // Check if Upstox data was cached
  const freshCached = cache.get<LiveMarketData>(CacheKeys.marketLive())
  if (freshCached) {
    return NextResponse.json({
      success: true,
      data: freshCached,
      freshness: Date.now() - freshCached.timestamp,
    })
  }

  // Upstox didn't return data — fall back to database
  const dbData = await fetchDatabaseFallback()
  if (dbData) {
    // Cache DB data with a longer TTL (3 seconds) to avoid hammering DB
    cache.set(CacheKeys.marketLive(), dbData, 3000)
    return NextResponse.json({
      success: true,
      data: dbData,
      freshness: 0,
    })
  }

  // Absolute fallback — empty data
  return NextResponse.json({
    success: true,
    data: { indices: {}, stocks: {}, timestamp: 0, source: 'none' },
    freshness: -1,
  })
}
