import { NextResponse } from 'next/server'

const GATEWAY_URL = 'https://internal-api.z.ai'
const API_PREFIX = '/external/finance'

// Yahoo Finance symbols for Indian indices
const INDEX_SYMBOLS: Record<string, { yahoo: string; name: string; lotSize: number; strikeInterval: number }> = {
  NIFTY: { yahoo: '^NSEI', name: 'NIFTY 50', lotSize: 50, strikeInterval: 50 },
  BANKNIFTY: { yahoo: '^NSEBANK', name: 'BANK NIFTY', lotSize: 25, strikeInterval: 100 },
  SENSEX: { yahoo: '^BSESN', name: 'SENSEX', lotSize: 15, strikeInterval: 100 },
  FINNIFTY: { yahoo: '^CRSLDX', name: 'FINNIFTY', lotSize: 40, strikeInterval: 50 },
  MIDCPNIFTY: { yahoo: '^NSMIDCP', name: 'MIDCAP NIFTY', lotSize: 75, strikeInterval: 50 },
}

// Fallback data when API is unavailable
const FALLBACK_DATA: Record<string, {
  symbol: string; name: string; currentPrice: number; change: number; changePercent: number
  open: number; high: number; low: number; previousClose: number; volume: number
  week52High: number; week52Low: number; lotSize: number; strikeInterval: number
}> = {
  NIFTY: { symbol: 'NIFTY', name: 'NIFTY 50', currentPrice: 22456.80, change: 142.30, changePercent: 0.64, open: 22350.00, high: 22510.45, low: 22310.20, previousClose: 22314.50, volume: 285600000, week52High: 24234.00, week52Low: 19170.00, lotSize: 50, strikeInterval: 50 },
  BANKNIFTY: { symbol: 'BANKNIFTY', name: 'BANK NIFTY', currentPrice: 47210.45, change: -82.10, changePercent: -0.17, open: 47350.00, high: 47480.30, low: 47050.60, previousClose: 47292.55, volume: 198400000, week52High: 51945.00, week52Low: 39450.00, lotSize: 25, strikeInterval: 100 },
  SENSEX: { symbol: 'SENSEX', name: 'SENSEX', currentPrice: 73645.25, change: 450.15, changePercent: 0.61, open: 73250.00, high: 73810.50, low: 73180.30, previousClose: 73195.10, volume: 312000000, week52High: 79840.00, week52Low: 62830.00, lotSize: 15, strikeInterval: 100 },
  FINNIFTY: { symbol: 'FINNIFTY', name: 'FINNIFTY', currentPrice: 21150.75, change: 85.75, changePercent: 0.41, open: 21080.00, high: 21220.40, low: 21050.10, previousClose: 21065.00, volume: 45200000, week52High: 22980.00, week52Low: 18350.00, lotSize: 40, strikeInterval: 50 },
  MIDCPNIFTY: { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', currentPrice: 51250.10, change: 40.10, changePercent: 0.08, open: 51200.00, high: 51380.50, low: 51100.30, previousClose: 51210.00, volume: 78500000, week52High: 56890.00, week52Low: 42350.00, lotSize: 75, strikeInterval: 50 },
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()
    const indexConfig = INDEX_SYMBOLS[symbolUpper]

    if (!indexConfig) {
      return NextResponse.json(
        { success: false, error: `Unknown index: ${symbol}` },
        { status: 400 }
      )
    }

    try {
      // Try to fetch real data from Finance API
      const quoteRes = await fetch(
        `${GATEWAY_URL}${API_PREFIX}/v1/markets/quote?ticker=${encodeURIComponent(indexConfig.yahoo)}&type=STOCKS`,
        { headers: { 'X-Z-AI-From': 'Z' }, next: { revalidate: 60 } }
      )

      if (quoteRes.ok) {
        const quoteData = await quoteRes.json()
        const body = quoteData?.body

        if (body) {
          const currentPrice = parseFloat(body.regularMarketPrice?.raw || body.regularMarketPrice || '0')
          const previousClose = parseFloat(body.regularMarketPreviousClose?.raw || body.regularMarketPreviousClose || '0')
          const change = currentPrice - previousClose
          const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

          const result = {
            symbol: symbolUpper,
            name: body.shortName || indexConfig.name,
            currentPrice,
            change,
            changePercent,
            open: parseFloat(body.regularMarketOpen?.raw || body.regularMarketOpen || '0'),
            high: parseFloat(body.regularMarketDayHigh?.raw || body.regularMarketDayHigh || '0'),
            low: parseFloat(body.regularMarketDayLow?.raw || body.regularMarketDayLow || '0'),
            previousClose,
            volume: parseInt(body.regularMarketVolume?.raw || body.regularMarketVolume || '0'),
            week52High: parseFloat(body.fiftyTwoWeekHigh?.raw || body.fiftyTwoWeekHigh || '0'),
            week52Low: parseFloat(body.fiftyTwoWeekLow?.raw || body.fiftyTwoWeekLow || '0'),
            lotSize: indexConfig.lotSize,
            strikeInterval: indexConfig.strikeInterval,
            marketState: body.marketState || 'CLOSED',
            exchange: body.fullExchangeName || 'NSI',
            currency: body.currency || 'INR',
            isRealData: true,
          }

          return NextResponse.json({ success: true, data: result })
        }
      }
    } catch (apiErr) {
      console.warn(`[API /market/index-detail/${symbolUpper}] Finance API error:`, apiErr)
    }

    // Fallback to static data
    const fallback = FALLBACK_DATA[symbolUpper]
    return NextResponse.json({
      success: true,
      data: { ...fallback, isRealData: false },
    })
  } catch (error) {
    console.error(`[API /market/index-detail] Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch index detail' },
      { status: 500 }
    )
  }
}
