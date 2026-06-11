import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getInstrumentKey, getUpstoxHistoricalData, getFinanceHistoricalData } from '@/lib/upstox-api'

// Force dynamic
export const dynamic = 'force-dynamic'
export const revalidate = 0

const GATEWAY_URL = 'https://internal-api.z.ai'
const API_PREFIX = '/external/finance'

const INDEX_SYMBOLS: Record<string, string> = {
  NIFTY: '^NSEI',
  BANKNIFTY: '^NSEBANK',
  SENSEX: '^BSESN',
  FINNIFTY: '^CRSLDX',
  MIDCPNIFTY: '^NSMIDCP',
}

const INTERVAL_MAP: Record<string, { yahoo: string; upstox: string }> = {
  '1D': { yahoo: '5m', upstox: '1minute' },
  '1W': { yahoo: '30m', upstox: '30minute' },
  '1M': { yahoo: '1d', upstox: 'day' },
  '3M': { yahoo: '1d', upstox: 'day' },
  '6M': { yahoo: '1wk', upstox: 'week' },
  '1Y': { yahoo: '1wk', upstox: 'week' },
  '5Y': { yahoo: '1mo', upstox: 'month' },
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

// Generate realistic mock chart data
function generateMockChartData(symbol: string, range: string) {
  const basePrices: Record<string, number> = {
    NIFTY: 22456,
    BANKNIFTY: 47210,
    SENSEX: 73645,
    FINNIFTY: 21150,
    MIDCPNIFTY: 51250,
  }
  const base = basePrices[symbol] || 20000
  const count = LIMIT_MAP[range] || 30
  const now = Date.now()
  const data = []

  let price = base * (0.95 + Math.random() * 0.05)

  for (let i = count - 1; i >= 0; i--) {
    const volatility = symbol === 'BANKNIFTY' ? 0.012 : symbol === 'SENSEX' ? 0.008 : 0.01
    const change = (Math.random() - 0.48) * volatility * price
    price = Math.max(price * 0.9, price + change)
    const open = price - (Math.random() - 0.5) * 30
    const high = Math.max(price, open) + Math.random() * 40
    const low = Math.min(price, open) - Math.random() * 40
    const volume = Math.floor(Math.random() * 50000000) + 10000000

    let timestamp: number
    if (range === '1D') {
      timestamp = now - i * 5 * 60 * 1000
    } else if (range === '1W') {
      timestamp = now - i * 30 * 60 * 1000
    } else if (range === '1M') {
      timestamp = now - i * 24 * 60 * 60 * 1000
    } else if (range === '3M') {
      timestamp = now - i * 24 * 60 * 60 * 1000
    } else if (range === '6M') {
      timestamp = now - i * 7 * 24 * 60 * 60 * 1000
    } else if (range === '1Y') {
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
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()
    const yahooSymbol = INDEX_SYMBOLS[symbolUpper]

    if (!yahooSymbol) {
      return NextResponse.json(
        { success: false, error: `Unknown index: ${symbol}` },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '1M'
    const intervals = INTERVAL_MAP[range]
    const limit = LIMIT_MAP[range] || 30

    // 1. Try Upstox API for historical data
    if (await isUpstoxAuthenticated()) {
      try {
        const instrumentKey = getInstrumentKey(symbolUpper, 'NSE_INDEX')
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
        console.warn(`[Upstox] Index chart error for ${symbolUpper}:`, upstoxErr)
      }
    }

    // 2. Try Finance API (Yahoo)
    try {
      const chartRes = await fetch(
        `${GATEWAY_URL}${API_PREFIX}/v2/markets/stock/history?symbol=${encodeURIComponent(yahooSymbol)}&interval=${intervals.yahoo}&limit=${limit}`,
        { headers: { 'X-Z-AI-From': 'Z' }, cache: 'no-store' }
      )

      if (chartRes.ok) {
        const chartData = await chartRes.json()
        const body = chartData?.body

        if (body && Array.isArray(body) && body.length > 0) {
          const parsed = body.map((candle: Record<string, unknown>) => ({
            date: candle.date || candle.timestamp || '',
            open: parseFloat(String(candle.open || '0')),
            high: parseFloat(String(candle.high || '0')),
            low: parseFloat(String(candle.low || '0')),
            close: parseFloat(String(candle.close || '0')),
            volume: parseInt(String(candle.volume || '0')),
          })).filter((c: { close: number }) => c.close > 0)

          if (parsed.length > 0) {
            return NextResponse.json({
              success: true,
              data: parsed,
              isRealData: true,
              dataSource: 'yahoo',
            })
          }
        }
      }
    } catch (apiErr) {
      console.warn(`[API /market/index-chart/${symbolUpper}] Finance API error:`, apiErr)
    }

    // 3. Fallback to generated chart data
    const mockData = generateMockChartData(symbolUpper, range)
    return NextResponse.json({
      success: true,
      data: mockData,
      isRealData: false,
      dataSource: 'mock',
    })
  } catch (error) {
    console.error(`[API /market/index-chart] Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}
