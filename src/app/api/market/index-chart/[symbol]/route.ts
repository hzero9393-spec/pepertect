import { NextResponse } from 'next/server'

const GATEWAY_URL = 'https://internal-api.z.ai'
const API_PREFIX = '/external/finance'

const INDEX_SYMBOLS: Record<string, string> = {
  NIFTY: '^NSEI',
  BANKNIFTY: '^NSEBANK',
  SENSEX: '^BSESN',
  FINNIFTY: '^CRSLDX',
  MIDCPNIFTY: '^NSMIDCP',
}

const INTERVAL_MAP: Record<string, string> = {
  '1D': '5m',
  '1W': '30m',
  '1M': '1d',
  '3M': '1d',
  '6M': '1wk',
  '1Y': '1wk',
  '5Y': '1mo',
}

const LIMIT_MAP: Record<string, number> = {
  '1D': 78,   // ~78 5-min candles in a trading day
  '1W': 70,   // ~70 30-min candles in a week
  '1M': 22,   // ~22 trading days
  '3M': 65,   // ~65 trading days
  '6M': 26,   // ~26 weeks
  '1Y': 52,   // ~52 weeks
  '5Y': 60,   // ~60 months
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

    // Calculate timestamp based on range
    let timestamp: number
    if (range === '1D') {
      timestamp = now - i * 5 * 60 * 1000 // 5 min intervals
    } else if (range === '1W') {
      timestamp = now - i * 30 * 60 * 1000 // 30 min intervals
    } else if (range === '1M') {
      timestamp = now - i * 24 * 60 * 60 * 1000 // daily
    } else if (range === '3M') {
      timestamp = now - i * 24 * 60 * 60 * 1000 // daily
    } else if (range === '6M') {
      timestamp = now - i * 7 * 24 * 60 * 60 * 1000 // weekly
    } else if (range === '1Y') {
      timestamp = now - i * 7 * 24 * 60 * 60 * 1000 // weekly
    } else {
      timestamp = now - i * 30 * 24 * 60 * 60 * 1000 // monthly
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
    const interval = INTERVAL_MAP[range] || '1d'
    const limit = LIMIT_MAP[range] || 30

    try {
      // Try to fetch real chart data from Finance API
      const chartRes = await fetch(
        `${GATEWAY_URL}${API_PREFIX}/v2/markets/stock/history?symbol=${encodeURIComponent(yahooSymbol)}&interval=${interval}&limit=${limit}`,
        { headers: { 'X-Z-AI-From': 'Z' }, next: { revalidate: 120 } }
      )

      if (chartRes.ok) {
        const chartData = await chartRes.json()
        const body = chartData?.body

        if (body && Array.isArray(body) && body.length > 0) {
          // Parse the chart data from the API
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
            })
          }
        }
      }
    } catch (apiErr) {
      console.warn(`[API /market/index-chart/${symbolUpper}] Finance API error:`, apiErr)
    }

    // Fallback to generated chart data
    const mockData = generateMockChartData(symbolUpper, range)
    return NextResponse.json({
      success: true,
      data: mockData,
      isRealData: false,
    })
  } catch (error) {
    console.error(`[API /market/index-chart] Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chart data' },
      { status: 500 }
    )
  }
}
