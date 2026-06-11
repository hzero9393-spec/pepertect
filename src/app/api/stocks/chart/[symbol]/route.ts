import { NextRequest, NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getInstrumentKey, getUpstoxHistoricalData, getFinanceHistoricalData } from '@/lib/upstox-api'
import { isDhanConfigured, getSecurityId, getDhanHistoricalData } from '@/lib/dhan-api'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

const INTERVAL_MAP: Record<string, { yahoo: string; dhan: string; upstox: string }> = {
  '1D': { yahoo: '5m', dhan: '1', upstox: '1minute' },
  '1W': { yahoo: '30m', dhan: '5', upstox: '30minute' },
  '1M': { yahoo: '1d', dhan: 'DAY', upstox: 'day' },
  '3M': { yahoo: '1d', dhan: 'DAY', upstox: 'day' },
  '6M': { yahoo: '1wk', dhan: 'WEEK', upstox: 'week' },
  '1Y': { yahoo: '1wk', dhan: 'WEEK', upstox: 'week' },
  '5Y': { yahoo: '1mo', dhan: 'MONTH', upstox: 'month' },
}

const LIMIT_MAP: Record<string, number> = {
  '1D': 78,
  '1W': 70,
  '1M': 22,
  '3M': 65,
  '6M': 26,
  '1Y': 52,
  '5Y': 60,
}

// Generate realistic mock chart data for stocks
function generateMockChartData(symbol: string, range: string, basePrice: number) {
  const count = LIMIT_MAP[range] || 30
  const now = Date.now()
  const data = []

  let price = basePrice * (0.95 + Math.random() * 0.05)
  const volatility = basePrice > 5000 ? 0.012 : basePrice > 500 ? 0.018 : 0.025

  for (let i = count - 1; i >= 0; i--) {
    const change = (Math.random() - 0.48) * volatility * price
    price = Math.max(price * 0.9, price + change)
    const open = price - (Math.random() - 0.5) * basePrice * 0.005
    const high = Math.max(price, open) + Math.random() * basePrice * 0.008
    const low = Math.min(price, open) - Math.random() * basePrice * 0.008
    const volume = Math.floor(Math.random() * 20000000) + 1000000

    let timestamp: number
    if (range === '1D') {
      timestamp = now - i * 5 * 60 * 1000
    } else if (range === '1W') {
      timestamp = now - i * 30 * 60 * 1000
    } else if (range === '1M' || range === '3M') {
      timestamp = now - i * 24 * 60 * 60 * 1000
    } else if (range === '6M' || range === '1Y') {
      timestamp = now - i * 7 * 24 * 60 * 60 * 1000
    } else {
      timestamp = now - i * 30 * 24 * 60 * 60 * 1000
    }

    data.push({
      date: new Date(timestamp).toISOString(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(price.toFixed(2)),
      volume,
    })
  }

  return data
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '1M'
    const basePrice = searchParams.get('basePrice') ? parseFloat(searchParams.get('basePrice')!) : 1500

    const intervals = INTERVAL_MAP[range]

    // 1. Try Upstox API for historical data
    if (await isUpstoxAuthenticated()) {
      try {
        const instrumentKey = getInstrumentKey(symbolUpper, 'NSE_EQ')
        if (instrumentKey) {
          const now = new Date()
          const from = new Date(now)

          if (range === '1D') from.setDate(from.getDate() - 1)
          else if (range === '1W') from.setDate(from.getDate() - 7)
          else if (range === '1M') from.setMonth(from.getMonth() - 1)
          else if (range === '3M') from.setMonth(from.getMonth() - 3)
          else if (range === '6M') from.setMonth(from.getMonth() - 6)
          else if (range === '1Y') from.setFullYear(from.getFullYear() - 1)
          else from.setFullYear(from.getFullYear() - 5)

          const candles = await getUpstoxHistoricalData(
            instrumentKey,
            intervals.upstox,
            from.toISOString().split('T')[0],
            now.toISOString().split('T')[0]
          )

          if (candles.length > 0) {
            const parsed = candles.map(c => ({
              date: c.timestamp,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
            })).filter(c => c.close > 0)

            if (parsed.length > 0) {
              return NextResponse.json({
                success: true,
                data: parsed,
                isRealData: true,
                dataSource: 'upstox',
              })
            }
          }
        }
      } catch (upstoxErr) {
        console.warn(`[Upstox] Chart data error for ${symbolUpper}:`, upstoxErr)
      }
    }

    // 2. Try Dhan API for historical data
    if (isDhanConfigured()) {
      const securityId = getSecurityId(symbolUpper, 'NSE_EQ')
      const foId = getSecurityId(symbolUpper, 'NSE_FO')
      const id = securityId || foId
      const segment = securityId ? 'NSE_EQ' : 'NSE_FO'

      if (id) {
        const now = new Date()
        const from = new Date(now)

        if (range === '1D') from.setDate(from.getDate() - 1)
        else if (range === '1W') from.setDate(from.getDate() - 7)
        else if (range === '1M') from.setMonth(from.getMonth() - 1)
        else if (range === '3M') from.setMonth(from.getMonth() - 3)
        else if (range === '6M') from.setMonth(from.getMonth() - 6)
        else if (range === '1Y') from.setFullYear(from.getFullYear() - 1)
        else from.setFullYear(from.getFullYear() - 5)

        const candles = await getDhanHistoricalData(
          id,
          segment,
          'EQUITY',
          0,
          Math.floor(from.getTime() / 1000).toString(),
          Math.floor(now.getTime() / 1000).toString(),
          intervals.dhan
        )

        if (candles.length > 0) {
          const parsed = candles.map(c => ({
            date: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          })).filter(c => c.close > 0)

          if (parsed.length > 0) {
            return NextResponse.json({
              success: true,
              data: parsed,
              isRealData: true,
              dataSource: 'dhan',
            })
          }
        }
      }
    }

    // 3. Try Finance API (Yahoo)
    try {
      const limit = LIMIT_MAP[range] || 30
      const candles = await getFinanceHistoricalData(symbolUpper, intervals.yahoo, limit)

      if (candles.length > 0) {
        const parsed = candles.map(c => ({
          date: c.timestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }))

        if (parsed.length > 0) {
          return NextResponse.json({
            success: true,
            data: parsed,
            isRealData: true,
            dataSource: 'yahoo',
          })
        }
      }
    } catch (apiErr) {
      console.warn(`[API /stocks/chart/${symbolUpper}] Finance API error:`, apiErr)
    }

    // 4. Fallback: generate mock chart data
    const mockData = generateMockChartData(symbolUpper, range, basePrice)
    return NextResponse.json({
      success: true,
      data: mockData,
      isRealData: false,
      dataSource: 'mock',
    })
  } catch (error) {
    console.error(`[API /stocks/chart] Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}
