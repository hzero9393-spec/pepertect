// ─── Dhan HQ API Integration ───────────────────────────────────────────────
// Provides real-time market data, F&O data, option chain, and historical data
// from Dhan HQ API (https://api.dhan.co)
//
// Set DHAN_ACCESS_TOKEN env variable to enable real data
// Falls back to DB/Yahoo Finance when token is not set

const DHAN_BASE_URL = 'https://api.dhan.co'
const FINANCE_GATEWAY = 'https://internal-api.z.ai'
const FINANCE_PREFIX = '/external/finance'

// ─── Types ────────────────────────────────────────────────────────────────

export interface DhanQuote {
  symbol: string
  securityId: number
  exchangeSegment: string
  ltp: number
  open: number
  high: number
  low: number
  close: number
  previousClose: number
  change: number
  changePercent: number
  volume: number
  totalTradedValue: number
  totalTradedQuantity: number
  averageTradePrice: number
  lastTradedTime: string
  oi: number
  oiChange: number
  upperCircuit: number
  lowerCircuit: number
  week52High: number
  week52Low: number
  marketCap: number
}

export interface DhanOHLC {
  symbol: string
  securityId: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface DhanOptionChainItem {
  strikePrice: number
  expiryDate: string
  ceLtp: number
  ceChange: number
  ceChangePercent: number
  ceVolume: number
  ceOI: number
  ceOIChange: number
  ceIV: number
  ceDelta: number
  ceGamma: number
  ceTheta: number
  ceVega: number
  peLtp: number
  peChange: number
  peChangePercent: number
  peVolume: number
  peOI: number
  peOIChange: number
  peIV: number
  peDelta: number
  peGamma: number
  peTheta: number
  peVega: number
}

export interface DhanOptionChain {
  underlying: string
  underlyingPrice: number
  expiries: string[]
  optionChain: DhanOptionChainItem[]
  pcr: number
  maxPain: number
  ivPercentile: number
}

export interface DhanFutureContract {
  underlying: string
  expiryDate: string
  lotSize: number
  ltp: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  previousClose: number
  volume: number
  oi: number
  oiChange: number
  basis: number
  basisPercent: number
}

export interface DhanFnoData {
  futures: DhanFutureContract[]
  optionChainSummary: {
    totalCallOI: number
    totalPutOI: number
    pcr: number
    maxPain: number
    ivPercentile: number
    nearestExpiry: string
    availableExpiries: string[]
  }
  optionChain: DhanOptionChainItem[]
}

export interface DhanHistoricalCandle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ─── Security ID Mapping ──────────────────────────────────────────────────
// NSE F&O Security IDs for major Indian stocks (Dhan uses numeric IDs)
// These map symbol -> securityId for NSE_FO segment

const NSE_FO_SECURITY_MAP: Record<string, number> = {
  // Index
  NIFTY: 13,
  BANKNIFTY: 25,
  FINNIFTY: 27,
  // Nifty 50 Major
  RELIANCE: 1,
  TCS: 2,
  HDFCBANK: 3,
  INFY: 4,
  ICICIBANK: 5,
  HINDUNILVR: 6,
  SBIN: 7,
  BHARTIARTL: 8,
  ITC: 9,
  KOTAKBANK: 10,
  LT: 11,
  AXISBANK: 12,
  BAJFINANCE: 14,
  ASIANPAINT: 15,
  MARUTI: 16,
  SUNPHARMA: 17,
  TATAMOTORS: 18,
  WIPRO: 19,
  HCLTECH: 20,
  ULTRACEMCO: 21,
  TITAN: 22,
  NESTLEIND: 23,
  NTPC: 24,
  POWERGRID: 26,
  ONGC: 28,
  TATASTEEL: 29,
  ADANIENT: 30,
  ADANIPORTS: 31,
  JSWSTEEL: 32,
  COALINDIA: 33,
  BPCL: 34,
  HINDALCO: 35,
  GRASIM: 36,
  TECHM: 37,
  BAJAJFINSV: 38,
  DRREDDY: 39,
  CIPLA: 40,
  EICHERMOT: 41,
  TATACONSUM: 42,
  HEROMOTOCO: 43,
  'M&M': 44,
  APOLLOHOSP: 45,
  DIVISLAB: 46,
  BRITANNIA: 47,
  INDUSINDBK: 48,
  HDFCLIFE: 49,
  SBILIFE: 50,
  // Bank Nifty
  BANKBARODA: 51,
  PNB: 52,
  AUBANK: 53,
  BANDHANBNK: 54,
  FEDERALBNK: 55,
  IDFCFIRSTB: 56,
  CANBK: 57,
  UNIONBANK: 58,
}

// NSE_EQ Security IDs (Cash segment)
const NSE_EQ_SECURITY_MAP: Record<string, number> = {
  RELIANCE: 2885,
  TCS: 11536,
  HDFCBANK: 1333,
  INFY: 1594,
  ICICIBANK: 4963,
  HINDUNILVR: 317,
  SBIN: 772,
  BHARTIARTL: 10604,
  ITC: 1660,
  KOTAKBANK: 4923,
  LT: 2714,
  AXISBANK: 5900,
  BAJFINANCE: 3172,
  ASIANPAINT: 5633,
  MARUTI: 10999,
  SUNPHARMA: 3351,
  TATAMOTORS: 3456,
  WIPRO: 3787,
  HCLTECH: 4218,
  ULTRACEMCO: 2938,
  TITAN: 3506,
  NESTLEIND: 17963,
  NTPC: 11630,
  POWERGRID: 10274,
  ONGC: 12220,
  TATASTEEL: 3464,
  ADANIENT: 3405,
  ADANIPORTS: 15083,
  JSWSTEEL: 11425,
  COALINDIA: 11482,
  BPCL: 1624,
  HINDALCO: 1363,
  GRASIM: 3288,
  TECHM: 1354,
  BAJAJFINSV: 2969,
  DRREDDY: 2364,
  CIPLA: 1024,
  EICHERMOT: 9755,
  TATACONSUM: 14453,
  HEROMOTOCO: 3450,
  'M&M': 11758,
  APOLLOHOSP: 19510,
  DIVISLAB: 19676,
  BRITANNIA: 16675,
  INDUSINDBK: 5424,
  HDFCLIFE: 7085,
  SBILIFE: 10022,
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function getAccessToken(): string | null {
  return process.env.DHAN_ACCESS_TOKEN || null
}

function getSecurityId(symbol: string, segment: 'NSE_FO' | 'NSE_EQ' = 'NSE_EQ'): number | null {
  const map = segment === 'NSE_FO' ? NSE_FO_SECURITY_MAP : NSE_EQ_SECURITY_MAP
  return map[symbol] || null
}

function isDhanConfigured(): boolean {
  return !!getAccessToken()
}

// ─── Dhan API Functions ───────────────────────────────────────────────────

/**
 * Get real-time quotes from Dhan API
 */
export async function getDhanQuotes(securityIds: number[], segment: string = 'NSE_EQ'): Promise<DhanQuote[]> {
  const token = getAccessToken()
  if (!token) return []

  try {
    const res = await fetch(`${DHAN_BASE_URL}/v2/quotes`, {
      method: 'POST',
      headers: {
        'access-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        securityIds.map(id => ({ securityId: id, exchangeSegment: segment }))
      ),
      next: { revalidate: 30 },
    })

    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * Get single stock quote from Dhan
 */
export async function getDhanStockQuote(symbol: string): Promise<DhanQuote | null> {
  const eqId = getSecurityId(symbol, 'NSE_EQ')
  const foId = getSecurityId(symbol, 'NSE_FO')

  // Try EQ first, then FO
  const ids = eqId ? [eqId] : foId ? [foId] : []
  if (ids.length === 0) return null

  const quotes = await getDhanQuotes(ids, eqId ? 'NSE_EQ' : 'NSE_FO')
  return quotes.length > 0 ? quotes[0] : null
}

/**
 * Get OHLC data from Dhan
 */
export async function getDhanOHLC(securityIds: number[], segment: string = 'NSE_EQ'): Promise<DhanOHLC[]> {
  const token = getAccessToken()
  if (!token) return []

  try {
    const res = await fetch(`${DHAN_BASE_URL}/v2/ohlc`, {
      method: 'POST',
      headers: {
        'access-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        securityIds.map(id => ({ securityId: id, exchangeSegment: segment }))
      ),
      next: { revalidate: 60 },
    })

    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * Get option chain from Dhan
 */
export async function getDhanOptionChain(
  underlyingSecurityId: number,
  underlyingSegment: string = 'INDEX'
): Promise<DhanOptionChain | null> {
  const token = getAccessToken()
  if (!token) return null

  try {
    const segment = underlyingSegment === 'INDEX' ? 'NSE_IDX' : 'NSE_FO'
    const res = await fetch(
      `${DHAN_BASE_URL}/v2/optionchain/${underlyingSecurityId}/${segment}`,
      {
        headers: { 'access-token': token },
        next: { revalidate: 30 },
      }
    )

    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Get historical candle data from Dhan
 */
export async function getDhanHistoricalData(
  securityId: number,
  exchangeSegment: string = 'NSE_EQ',
  instrumentType: string = 'EQUITY',
  expiryCode: number = 0,
  from: string,
  to: string,
  resolution: string = 'DAY'
): Promise<DhanHistoricalCandle[]> {
  const token = getAccessToken()
  if (!token) return []

  try {
    const res = await fetch(`${DHAN_BASE_URL}/v2/charts/historical`, {
      method: 'POST',
      headers: {
        'access-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        securityId: String(securityId),
        exchangeSegment,
        instrumentType,
        expiryCode,
        from,
        to,
        resolution,
      }),
    })

    if (!res.ok) return []
    const data = await res.json()
    if (!data?.open) return []

    // Dhan returns separate arrays for OHLCV
    const len = data.open?.length || 0
    const candles: DhanHistoricalCandle[] = []
    for (let i = 0; i < len; i++) {
      candles.push({
        timestamp: data.timestamp?.[i] || '',
        open: data.open[i],
        high: data.high[i],
        low: data.low[i],
        close: data.close[i],
        volume: data.volume?.[i] || 0,
      })
    }
    return candles
  } catch {
    return []
  }
}

/**
 * Get expiry list for F&O instruments
 */
export async function getDhanExpiries(
  underlyingSecurityId: number,
  segment: string = 'NSE_FO'
): Promise<string[]> {
  const token = getAccessToken()
  if (!token) return []

  try {
    const res = await fetch(
      `${DHAN_BASE_URL}/v2/optionchain/${underlyingSecurityId}/${segment === 'NSE_FO' ? 'NSE_FO' : 'NSE_IDX'}`,
      {
        headers: { 'access-token': token },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) return []
    const data = await res.json()
    return data?.expiries || []
  } catch {
    return []
  }
}

// ─── Finance API Gateway (Yahoo Finance) ──────────────────────────────────
// Used as fallback when Dhan is not configured

function getYahooSymbol(symbol: string): string {
  return `${symbol}.NS`
}

export async function getFinanceQuote(symbol: string): Promise<Record<string, unknown> | null> {
  try {
    const yahooSym = getYahooSymbol(symbol)
    const res = await fetch(
      `${FINANCE_GATEWAY}${FINANCE_PREFIX}/v1/markets/quote?ticker=${encodeURIComponent(yahooSym)}&type=STOCKS`,
      { headers: { 'X-Z-AI-From': 'Z' }, next: { revalidate: 60 } }
    )

    if (!res.ok) return null
    const json = await res.json()
    return json?.body || null
  } catch {
    return null
  }
}

export async function getFinanceHistoricalData(
  symbol: string,
  interval: string = '1d',
  limit: number = 30
): Promise<DhanHistoricalCandle[]> {
  try {
    const yahooSym = getYahooSymbol(symbol)
    const res = await fetch(
      `${FINANCE_GATEWAY}${FINANCE_PREFIX}/v2/markets/stock/history?symbol=${encodeURIComponent(yahooSym)}&interval=${interval}&limit=${limit}`,
      { headers: { 'X-Z-AI-From': 'Z' }, next: { revalidate: 120 } }
    )

    if (!res.ok) return []
    const json = await res.json()
    const body = json?.body

    if (!Array.isArray(body) || body.length === 0) return []

    return body.map((candle: Record<string, unknown>) => ({
      timestamp: String(candle.date || candle.timestamp || ''),
      open: parseFloat(String(candle.open || '0')),
      high: parseFloat(String(candle.high || '0')),
      low: parseFloat(String(candle.low || '0')),
      close: parseFloat(String(candle.close || '0')),
      volume: parseInt(String(candle.volume || '0')),
    })).filter((c: DhanHistoricalCandle) => c.close > 0)
  } catch {
    return []
  }
}

// ─── Combined Data Fetchers ───────────────────────────────────────────────
// These try Dhan first, then fall back to Finance API / DB

export interface StockOverviewData {
  // Basic Info
  symbol: string
  name: string
  sector: string
  industry: string
  exchange: string
  isin: string | null

  // Price Data
  currentPrice: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  previousClose: number
  close: number
  volume: number
  totalTradedValue: number
  averageTradePrice: number

  // 52 Week
  week52High: number
  week52Low: number

  // Circuit Limits
  upperCircuit: number
  lowerCircuit: number

  // Fundamentals
  marketCap: number
  peRatio: number | null
  eps: number
  dividendYield: number
  pbRatio: number
  roe: number
  bookValue: number
  debtToEquity: number
  faceValue: number
  industryPE: number

  // F&O Details
  lotSize: number
  isFuturesAvailable: boolean
  isOptionsAvailable: boolean
  isFnoBan: boolean
  strikeInterval: number | null

  // Delivery Data
  deliveryQuantity: number | null
  deliveryPercentage: number | null

  // VWAP
  vwap: number | null

  // Data Source
  isRealData: boolean
  dataSource: 'dhan' | 'yahoo' | 'database'
}

export interface StockFnoData {
  futures: DhanFutureContract[]
  optionChain: DhanOptionChainItem[]
  optionChainSummary: {
    totalCallOI: number
    totalPutOI: number
    pcr: number
    maxPain: number
    ivPercentile: number
    nearestExpiry: string
    availableExpiries: string[]
  }
  isRealData: boolean
  dataSource: 'dhan' | 'database'
}

/**
 * Fetch comprehensive stock overview data
 * Tries Dhan → Yahoo Finance → DB fallback
 */
export async function fetchStockOverviewData(symbol: string, dbStock: Record<string, unknown> | null): Promise<StockOverviewData> {
  const symbolUpper = symbol.toUpperCase()
  let dataSource: 'dhan' | 'yahoo' | 'database' = 'database'
  let realtimeData: Partial<StockOverviewData> = {}

  // Try Dhan API first
  if (isDhanConfigured()) {
    const dhanQuote = await getDhanStockQuote(symbolUpper)
    if (dhanQuote && dhanQuote.ltp > 0) {
      dataSource = 'dhan'
      realtimeData = {
        currentPrice: dhanQuote.ltp,
        open: dhanQuote.open,
        high: dhanQuote.high,
        low: dhanQuote.low,
        close: dhanQuote.close,
        previousClose: dhanQuote.previousClose,
        change: dhanQuote.change,
        changePercent: dhanQuote.changePercent,
        volume: dhanQuote.volume,
        totalTradedValue: dhanQuote.totalTradedValue,
        averageTradePrice: dhanQuote.averageTradePrice,
        week52High: dhanQuote.week52High,
        week52Low: dhanQuote.week52Low,
        upperCircuit: dhanQuote.upperCircuit,
        lowerCircuit: dhanQuote.lowerCircuit,
        marketCap: dhanQuote.marketCap,
        isRealData: true,
      }
    }
  }

  // Try Yahoo Finance if Dhan didn't work
  if (dataSource === 'database') {
    try {
      const yahooData = await getFinanceQuote(symbolUpper)
      if (yahooData) {
        dataSource = 'yahoo'
        const currentPrice = parseFloat(String(yahooData.regularMarketPrice?.raw || yahooData.regularMarketPrice || '0'))
        const previousClose = parseFloat(String(yahooData.regularMarketPreviousClose?.raw || yahooData.regularMarketPreviousClose || '0'))
        const change = currentPrice - previousClose
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

        realtimeData = {
          currentPrice,
          previousClose,
          change,
          changePercent,
          open: parseFloat(String(yahooData.regularMarketOpen?.raw || yahooData.regularMarketOpen || '0')),
          high: parseFloat(String(yahooData.regularMarketDayHigh?.raw || yahooData.regularMarketDayHigh || '0')),
          low: parseFloat(String(yahooData.regularMarketDayLow?.raw || yahooData.regularMarketDayLow || '0')),
          volume: parseInt(String(yahooData.regularMarketVolume?.raw || yahooData.regularMarketVolume || '0')),
          week52High: parseFloat(String(yahooData.fiftyTwoWeekHigh?.raw || yahooData.fiftyTwoWeekHigh || '0')),
          week52Low: parseFloat(String(yahooData.fiftyTwoWeekLow?.raw || yahooData.fiftyTwoWeekLow || '0')),
          marketCap: parseFloat(String(yahooData.marketCap?.raw || yahooData.marketCap || '0')),
          peRatio: parseFloat(String(yahooData.trailingPE?.raw || yahooData.trailingPE || dbStock?.peRatio || 0)) || null,
          eps: parseFloat(String(yahooData.epsTrailingTwelveMonths?.raw || yahooData.epsTrailingTwelveMonths || '0')),
          dividendYield: parseFloat(String(yahooData.dividendYield?.raw || yahooData.dividendYield || (dbStock?.dividendYield ? (dbStock.dividendYield as number) * 100 : 0) || 0)) / 100,
          pbRatio: parseFloat(String(yahooData.priceToBook?.raw || yahooData.priceToBook || '0')),
          roe: parseFloat(String(yahooData.returnOnEquity?.raw || yahooData.returnOnEquity || '0')) * 100,
          bookValue: parseFloat(String(yahooData.bookValue?.raw || yahooData.bookValue || '0')),
          debtToEquity: parseFloat(String(yahooData.debtToEquity?.raw || yahooData.debtToEquity || '0')),
          name: String(yahooData.shortName || dbStock?.name || symbolUpper),
          isRealData: true,
        }
      }
    } catch {
      // Fall through to DB
    }
  }

  // Merge with DB data
  const result: StockOverviewData = {
    symbol: symbolUpper,
    name: (realtimeData.name as string) || (dbStock?.name as string) || symbolUpper,
    sector: (dbStock?.sector as string) || '',
    industry: (dbStock?.industry as string) || '',
    exchange: (dbStock?.exchange as string) || 'NSE',
    isin: (dbStock?.isin as string) || null,

    currentPrice: (realtimeData.currentPrice as number) || (dbStock?.currentPrice as number) || 0,
    change: (realtimeData.change as number) || (dbStock?.change as number) || 0,
    changePercent: (realtimeData.changePercent as number) || (dbStock?.changePercent as number) || 0,
    open: (realtimeData.open as number) || (dbStock?.open as number) || 0,
    high: (realtimeData.high as number) || (dbStock?.high as number) || 0,
    low: (realtimeData.low as number) || (dbStock?.low as number) || 0,
    previousClose: (realtimeData.previousClose as number) || (dbStock?.previousClose as number) || 0,
    close: (realtimeData.close as number) || (realtimeData.currentPrice as number) || (dbStock?.currentPrice as number) || 0,
    volume: (realtimeData.volume as number) || (dbStock?.volume as number) || 0,
    totalTradedValue: (realtimeData.totalTradedValue as number) || 0,
    averageTradePrice: (realtimeData.averageTradePrice as number) || 0,

    week52High: (realtimeData.week52High as number) || (dbStock?.week52High as number) || 0,
    week52Low: (realtimeData.week52Low as number) || (dbStock?.week52Low as number) || 0,

    upperCircuit: (realtimeData.upperCircuit as number) || 0,
    lowerCircuit: (realtimeData.lowerCircuit as number) || 0,

    marketCap: (realtimeData.marketCap as number) || (dbStock?.marketCap as number) || 0,
    peRatio: (realtimeData.peRatio as number) || (dbStock?.peRatio as number) || null,
    eps: (realtimeData.eps as number) || 0,
    dividendYield: (realtimeData.dividendYield as number) || (dbStock?.dividendYield as number) || 0,
    pbRatio: (realtimeData.pbRatio as number) || 0,
    roe: (realtimeData.roe as number) || 0,
    bookValue: (realtimeData.bookValue as number) || 0,
    debtToEquity: (realtimeData.debtToEquity as number) || 0,
    faceValue: (realtimeData.faceValue as number) || (dbStock?.faceValue as number) || 10,
    industryPE: (realtimeData.industryPE as number) || 0,

    lotSize: (dbStock?.lotSize as number) || 1,
    isFuturesAvailable: (dbStock?.isFuturesAvailable as boolean) || false,
    isOptionsAvailable: (dbStock?.isOptionsAvailable as boolean) || false,
    isFnoBan: (dbStock?.isFnoBan as boolean) || false,
    strikeInterval: (dbStock?.strikeInterval as number) || null,

    deliveryQuantity: null,
    deliveryPercentage: null,
    vwap: (realtimeData.vwap as number) || null,

    isRealData: dataSource !== 'database',
    dataSource,
  }

  return result
}

/**
 * Fetch F&O data for a stock
 */
export async function fetchStockFnoData(symbol: string): Promise<StockFnoData> {
  const symbolUpper = symbol.toUpperCase()
  let dataSource: 'dhan' | 'database' = 'database'

  const result: StockFnoData = {
    futures: [],
    optionChain: [],
    optionChainSummary: {
      totalCallOI: 0,
      totalPutOI: 0,
      pcr: 0,
      maxPain: 0,
      ivPercentile: 0,
      nearestExpiry: '',
      availableExpiries: [],
    },
    isRealData: false,
    dataSource: 'database',
  }

  // Try Dhan API for F&O data
  if (isDhanConfigured()) {
    try {
      const foId = getSecurityId(symbolUpper, 'NSE_FO')
      if (foId) {
        const optionChain = await getDhanOptionChain(foId, 'STOCK')
        if (optionChain) {
          dataSource = 'dhan'
          result.optionChain = optionChain.optionChain || []
          result.optionChainSummary = {
            totalCallOI: optionChain.optionChain?.reduce((sum, item) => sum + item.ceOI, 0) || 0,
            totalPutOI: optionChain.optionChain?.reduce((sum, item) => sum + item.peOI, 0) || 0,
            pcr: optionChain.pcr || 0,
            maxPain: optionChain.maxPain || 0,
            ivPercentile: optionChain.ivPercentile || 0,
            nearestExpiry: optionChain.expiries?.[0] || '',
            availableExpiries: optionChain.expiries || [],
          }
          result.isRealData = true
          result.dataSource = 'dhan'
        }
      }
    } catch {
      // Fall through to DB
    }
  }

  // Fallback: Get F&O data from database
  if (dataSource === 'database') {
    try {
      const { db } = await import('@/lib/db')

      // Get futures
      const futures = await db.future.findMany({
        where: { underlying: symbolUpper, isActive: true },
        orderBy: { expiryDate: 'asc' },
      })

      result.futures = futures.map(f => ({
        underlying: f.underlying,
        expiryDate: f.expiryDate.toISOString().split('T')[0],
        lotSize: f.lotSize,
        ltp: f.ltp,
        change: f.change,
        changePercent: f.changePercent,
        open: f.open || 0,
        high: f.high || 0,
        low: f.low || 0,
        previousClose: f.previousClose || 0,
        volume: f.volume,
        oi: f.openInterest,
        oiChange: f.oiChange,
        basis: f.basis,
        basisPercent: f.ltp > 0 ? (f.basis / f.ltp) * 100 : 0,
      }))

      // Get option chain summary
      const options = await db.option.findMany({
        where: { underlying: symbolUpper, isActive: true },
        orderBy: [{ strikePrice: 'asc' }, { optionType: 'asc' }],
      })

      if (options.length > 0) {
        const expiries = [...new Set(options.map(o => o.expiryDate.toISOString().split('T')[0]))].sort()
        const totalCallOI = options.filter(o => o.optionType === 'CE').reduce((sum, o) => sum + o.openInterest, 0)
        const totalPutOI = options.filter(o => o.optionType === 'PE').reduce((sum, o) => sum + o.openInterest, 0)
        const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 0

        // Calculate max pain
        const strikes = [...new Set(options.map(o => o.strikePrice))].sort((a, b) => a - b)
        let maxPain = strikes[0]
        let minLoss = Infinity
        for (const strike of strikes) {
          let totalLoss = 0
          for (const option of options) {
            const intrinsic = option.optionType === 'CE'
              ? Math.max(strike - option.strikePrice, 0)
              : Math.max(option.strikePrice - strike, 0)
            totalLoss += intrinsic * option.openInterest
          }
          if (totalLoss < minLoss) {
            minLoss = totalLoss
            maxPain = strike
          }
        }

        // Build option chain items
        const strikeMap = new Map<number, { ce?: typeof options[0]; pe?: typeof options[0] }>()
        for (const opt of options) {
          if (!strikeMap.has(opt.strikePrice)) {
            strikeMap.set(opt.strikePrice, {})
          }
          const entry = strikeMap.get(opt.strikePrice)!
          if (opt.optionType === 'CE') entry.ce = opt
          else entry.pe = opt
        }

        result.optionChain = Array.from(strikeMap.entries()).map(([strike, data]) => ({
          strikePrice: strike,
          expiryDate: (data.ce || data.pe)?.expiryDate.toISOString().split('T')[0] || '',
          ceLtp: data.ce?.ltp || 0,
          ceChange: data.ce?.change || 0,
          ceChangePercent: data.ce?.changePercent || 0,
          ceVolume: data.ce?.volume || 0,
          ceOI: data.ce?.openInterest || 0,
          ceOIChange: data.ce?.oiChange || 0,
          ceIV: data.ce?.impliedVolatility || 0,
          ceDelta: data.ce?.delta || 0,
          ceGamma: data.ce?.gamma || 0,
          ceTheta: data.ce?.theta || 0,
          ceVega: data.ce?.vega || 0,
          peLtp: data.pe?.ltp || 0,
          peChange: data.pe?.change || 0,
          peChangePercent: data.pe?.changePercent || 0,
          peVolume: data.pe?.volume || 0,
          peOI: data.pe?.openInterest || 0,
          peOIChange: data.pe?.oiChange || 0,
          peIV: data.pe?.impliedVolatility || 0,
          peDelta: data.pe?.delta || 0,
          peGamma: data.pe?.gamma || 0,
          peTheta: data.pe?.theta || 0,
          peVega: data.pe?.vega || 0,
        }))

        result.optionChainSummary = {
          totalCallOI,
          totalPutOI,
          pcr: Math.round(pcr * 100) / 100,
          maxPain,
          ivPercentile: 0,
          nearestExpiry: expiries[0] || '',
          availableExpiries: expiries,
        }

        result.isRealData = futures.length > 0 || options.length > 0
        result.dataSource = 'database'
      }
    } catch (error) {
      console.warn(`[Dhan API] DB fallback error for ${symbolUpper}:`, error)
    }
  }

  return result
}

// Export helpers
export { isDhanConfigured, getSecurityId }
