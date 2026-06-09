// ─── Upstox API v2 Integration ──────────────────────────────────────────────
// Provides real-time market data, quotes, OHLC, option chain, historical data
// and order management from Upstox API (https://api.upstox.com)
//
// Set UPSTOX_API_KEY and UPSTOX_API_SECRET env variables to enable
// Falls back to Dhan → Yahoo Finance → DB when not configured

const UPSTOX_BASE_URL = 'https://api.upstox.com'
const UPSTOX_API_V2 = `${UPSTOX_BASE_URL}/v2`
const FINANCE_GATEWAY = 'https://internal-api.z.ai'
const FINANCE_PREFIX = '/external/finance'

// ─── Types ────────────────────────────────────────────────────────────────

export interface UpstoxTokenResponse {
  status: string
  data: {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token: string
  }
}

export interface UpstoxProfile {
  user_id: string
  user_name: string
  email: string
  phone: string
  pan: string
  broker: string
  exchanges: string[]
  products: string[]
}

export interface UpstoxQuote {
  instrument_token: string
  symbol: string
  last_price: number
  ohlc: {
    open: number
    high: number
    low: number
    close: number
  }
  net_change: number
  volume: number | null
  average_price: number | null
  oi: number | null
  total_buy_quantity: number | null
  total_sell_quantity: number | null
  lower_circuit_limit: number | null
  upper_circuit_limit: number | null
  last_trade_time: string
  oi_day_high: number | null
  oi_day_low: number | null
  timestamp: string
  depth: {
    buy: Array<{ quantity: number; price: number; orders: number }>
    sell: Array<{ quantity: number; price: number; orders: number }>
  }
}

export interface UpstoxOHLC {
  instrument_token: string
  exchange: string
  trading_symbol: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface UpstoxHistoricalCandle {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  oi: number
}

export interface UpstoxOptionChainItem {
  strike_price: number
  expiry: string
  ce: {
    instrument_token: string
    ltp: number
    change: number
    change_percent: number
    volume: number
    oi: number
    iv: number
    bid_price: number
    ask_price: number
    delta: number
    gamma: number
    theta: number
    vega: number
  } | null
  pe: {
    instrument_token: string
    ltp: number
    change: number
    change_percent: number
    volume: number
    oi: number
    iv: number
    bid_price: number
    ask_price: number
    delta: number
    gamma: number
    theta: number
    vega: number
  } | null
}

export interface UpstoxOptionChain {
  underlying_spot_price: number
  option_chain: UpstoxOptionChainItem[]
}

export interface UpstoxPostbackData {
  order_id: string
  exchange_order_id: string
  trading_symbol: string
  exchange: string
  transaction_type: string
  product: string
  order_type: string
  quantity: number
  price: number
  trigger_price: number
  status: string
  filled_quantity: number
  average_price: number
  order_request_id: string
  user_id: string
  placed_at: string
  updated_at: string
  tag: string | null
}

export interface UpstoxWebhookData {
  event: string
  data: {
    instrument_token: string
    exchange: string
    trading_symbol: string
    ltp: number
    change: number
    change_percent: number
    volume: number
    oi: number
    high: number
    low: number
    close: number
    timestamp: string
  }
}

// ─── Instrument Key Mapping ──────────────────────────────────────────────
// Upstox uses instrument_key format: NSE_EQ|IN0001, NSE_FO|43521, NSE_INDEX|Nifty 50

export const NSE_EQ_INSTRUMENT_MAP: Record<string, string> = {
  RELIANCE: 'NSE_EQ|INE002A01018',
  TCS: 'NSE_EQ|INE467B01029',
  HDFCBANK: 'NSE_EQ|INE040A01034',
  INFY: 'NSE_EQ|INE009A01021',
  ICICIBANK: 'NSE_EQ|INE090A01021',
  HINDUNILVR: 'NSE_EQ|INE030A01027',
  SBIN: 'NSE_EQ|INE062A01020',
  BHARTIARTL: 'NSE_EQ|INE738A01025',
  ITC: 'NSE_EQ|INE154A01025',
  KOTAKBANK: 'NSE_EQ|INE237A01028',
  LT: 'NSE_EQ|INE018A01030',
  AXISBANK: 'NSE_EQ|INE238A01034',
  BAJFINANCE: 'NSE_EQ|INE296A01024',
  ASIANPAINT: 'NSE_EQ|INE021A01026',
  MARUTI: 'NSE_EQ|INE585B01010',
  SUNPHARMA: 'NSE_EQ|INE044A01036',
  TATAMOTORS: 'NSE_EQ|INE155A01022',
  WIPRO: 'NSE_EQ|INE075A01022',
  HCLTECH: 'NSE_EQ|INE860A01027',
  ULTRACEMCO: 'NSE_EQ|INE237A01028',
  TITAN: 'NSE_EQ|INE280A01028',
  NESTLEIND: 'NSE_EQ|INE239A01042',
  NTPC: 'NSE_EQ|INE733A01031',
  POWERGRID: 'NSE_EQ|INE752E01010',
  ONGC: 'NSE_EQ|INE213A01029',
  TATASTEEL: 'NSE_EQ|INE081A01024',
  ADANIENT: 'NSE_EQ|INE423A01024',
  ADANIPORTS: 'NSE_EQ|INE742A01034',
  JSWSTEEL: 'NSE_EQ|INE019A01033',
  COALINDIA: 'NSE_EQ|INE522A01034',
  BPCL: 'NSE_EQ|INE029A01011',
  HINDALCO: 'NSE_EQ|INE038A01020',
  GRASIM: 'NSE_EQ|INE049A01031',
  TECHM: 'NSE_EQ|INE669C01020',
  BAJAJFINSV: 'NSE_EQ|INE298A01023',
  DRREDDY: 'NSE_EQ|INE088A01026',
  CIPLA: 'NSE_EQ|INE043A01027',
  EICHERMOT: 'NSE_EQ|INE066B01021',
  TATACONSUM: 'NSE_EQ|INE123A01022',
  HEROMOTOCO: 'NSE_EQ|INE158A01026',
  'M&M': 'NSE_EQ|INE101A01026',
  APOLLOHOSP: 'NSE_EQ|INE437B01018',
  DIVISLAB: 'NSE_EQ|INE363B01018',
  BRITANNIA: 'NSE_EQ|INE216A01030',
  INDUSINDBK: 'NSE_EQ|INE526A01015',
  HDFCLIFE: 'NSE_EQ|INE744G01013',
  SBILIFE: 'NSE_EQ|INE123B01016',
}

export const NSE_INDEX_INSTRUMENT_MAP: Record<string, string> = {
  NIFTY: 'NSE_INDEX|Nifty 50',
  BANKNIFTY: 'NSE_INDEX|Nifty Bank',
  FINNIFTY: 'NSE_INDEX|Nifty Financial Services',
  SENSEX: 'BSE_INDEX|SENSEX',
  MIDCPNIFTY: 'NSE_INDEX|Nifty Midcap 150',
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function getApiKey(): string | null {
  return process.env.UPSTOX_API_KEY || null
}

function getApiSecret(): string | null {
  return process.env.UPSTOX_API_SECRET || null
}

function getAccessToken(): string | null {
  return process.env.UPSTOX_ACCESS_TOKEN || null
}

export function isUpstoxConfigured(): boolean {
  return !!(getApiKey() && getApiSecret())
}

export function isUpstoxAuthenticated(): boolean {
  return !!(getAccessToken())
}

export function getInstrumentKey(symbol: string, segment: 'NSE_EQ' | 'NSE_INDEX' = 'NSE_EQ'): string | null {
  if (segment === 'NSE_INDEX') {
    return NSE_INDEX_INSTRUMENT_MAP[symbol] || null
  }
  return NSE_EQ_INSTRUMENT_MAP[symbol] || null
}

// ─── OAuth2 Flow ────────────────────────────────────────────────────────

/**
 * Generate Upstox OAuth2 authorization URL
 */
export function getUpstoxAuthUrl(redirectUri: string, state?: string): string {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('UPSTOX_API_KEY not configured')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: apiKey,
    redirect_uri: redirectUri,
    scope: 'read write',
  })

  if (state) params.set('state', state)

  return `${UPSTOX_BASE_URL}/v2/auth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeUpstoxAuthCode(code: string, redirectUri: string): Promise<UpstoxTokenResponse> {
  const apiKey = getApiKey()
  const apiSecret = getApiSecret()
  if (!apiKey || !apiSecret) throw new Error('Upstox API credentials not configured')

  const res = await fetch(`${UPSTOX_API_V2}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      code,
      client_id: apiKey,
      client_secret: apiSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Upstox token exchange failed: ${error}`)
  }

  return await res.json()
}

/**
 * Get user profile from Upstox
 */
export async function getUpstoxProfile(): Promise<UpstoxProfile | null> {
  const token = getAccessToken()
  if (!token) return null

  try {
    const res = await fetch(`${UPSTOX_API_V2}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })

    if (!res.ok) return null
    const data = await res.json()
    return data?.data || null
  } catch {
    return null
  }
}

// ─── Market Data API ────────────────────────────────────────────────────

/**
 * Get real-time quotes from Upstox
 */
export async function getUpstoxQuotes(instrumentKeys: string[]): Promise<UpstoxQuote[]> {
  const token = getAccessToken()
  if (!token || instrumentKeys.length === 0) return []

  try {
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

    if (!res.ok) {
      console.warn(`[Upstox] Quotes API returned ${res.status}`)
      return []
    }
    const data = await res.json()
    if (!data?.data) return []

    // Upstox returns data as object keyed by "NSE_EQ:INE002A01018" or "NSE_INDEX:Nifty 50"
    return Object.values(data.data) as UpstoxQuote[]
  } catch (err) {
    console.warn('[Upstox] Quotes fetch error:', err)
    return []
  }
}

/**
 * Get single stock quote from Upstox
 */
export async function getUpstoxStockQuote(symbol: string): Promise<UpstoxQuote | null> {
  const eqKey = getInstrumentKey(symbol, 'NSE_EQ')
  if (!eqKey) return null

  const quotes = await getUpstoxQuotes([eqKey])
  return quotes.length > 0 ? quotes[0] : null
}

/**
 * Get index quote from Upstox
 */
export async function getUpstoxIndexQuote(symbol: string): Promise<UpstoxQuote | null> {
  const indexKey = getInstrumentKey(symbol, 'NSE_INDEX')
  if (!indexKey) return null

  const quotes = await getUpstoxQuotes([indexKey])
  return quotes.length > 0 ? quotes[0] : null
}

/**
 * Get OHLC data from Upstox
 */
export async function getUpstoxOHLC(instrumentKeys: string[]): Promise<UpstoxOHLC[]> {
  const token = getAccessToken()
  if (!token || instrumentKeys.length === 0) return []

  try {
    const res = await fetch(
      `${UPSTOX_API_V2}/market-quote/ohlc?instrument_key=${instrumentKeys.join(',')}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        next: { revalidate: 60 },
      }
    )

    if (!res.ok) return []
    const data = await res.json()
    if (!data?.data) return []

    return Object.values(data.data) as UpstoxOHLC[]
  } catch {
    return []
  }
}

/**
 * Get option chain from Upstox
 */
export async function getUpstoxOptionChain(
  underlyingInstrumentKey: string,
  expiryDate?: string
): Promise<UpstoxOptionChain | null> {
  const token = getAccessToken()
  if (!token) return null

  try {
    let url = `${UPSTOX_API_V2}/option/chain?underlying_instrument_key=${encodeURIComponent(underlyingInstrumentKey)}`
    if (expiryDate) url += `&expiry_date=${expiryDate}`

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) return null
    const data = await res.json()
    return data?.data || null
  } catch {
    return null
  }
}

/**
 * Get historical candle data from Upstox
 */
export async function getUpstoxHistoricalData(
  instrumentKey: string,
  resolution: string = 'day',
  fromDate: string,
  toDate: string
): Promise<UpstoxHistoricalCandle[]> {
  const token = getAccessToken()
  if (!token) return []

  try {
    // Upstox URL format: /historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}
    // to_date is the recent date, from_date is the older date
    const res = await fetch(
      `${UPSTOX_API_V2}/historical-candle/${encodeURIComponent(instrumentKey)}/${resolution}/${toDate}/${fromDate}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!res.ok) {
      console.warn(`[Upstox] Historical API returned ${res.status} for ${instrumentKey}`)
      return []
    }
    const data = await res.json()
    if (data?.status === 'error') {
      console.warn(`[Upstox] Historical API error:`, data.errors)
      return []
    }
    if (!data?.data?.candles) return []

    // Upstox returns candles as arrays: [timestamp, open, high, low, close, volume, oi]
    return data.data.candles.map((c: (string | number)[]) => ({
      timestamp: String(c[0]),
      open: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3]),
      close: Number(c[4]),
      volume: Number(c[5] || 0),
      oi: Number(c[6] || 0),
    }))
  } catch (err) {
    console.warn(`[Upstox] Historical data error:`, err)
    return []
  }
}

/**
 * Get expiry dates for an underlying from Upstox
 */
export async function getUpstoxExpiries(underlyingInstrumentKey: string): Promise<string[]> {
  const token = getAccessToken()
  if (!token) return []

  try {
    const res = await fetch(
      `${UPSTOX_API_V2}/option/chain?underlying_instrument_key=${encodeURIComponent(underlyingInstrumentKey)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        next: { revalidate: 300 },
      }
    )

    if (!res.ok) return []
    const data = await res.json()
    if (!data?.data?.option_chain) return []

    const expiries = new Set<string>()
    for (const item of data.data.option_chain as UpstoxOptionChainItem[]) {
      if (item.expiry) expiries.add(item.expiry)
    }

    return Array.from(expiries).sort()
  } catch {
    return []
  }
}

// ─── Market Data - Multi-index Quotes ──────────────────────────────────

/**
 * Get all configured index quotes from Upstox
 */
export async function getUpstoxAllIndexQuotes(): Promise<UpstoxQuote[]> {
  const keys = Object.values(NSE_INDEX_INSTRUMENT_MAP)
  return getUpstoxQuotes(keys)
}

/**
 * Get top NSE stock quotes from Upstox
 */
export async function getUpstoxTopStockQuotes(count: number = 50): Promise<UpstoxQuote[]> {
  const keys = Object.values(NSE_EQ_INSTRUMENT_MAP).slice(0, count)
  return getUpstoxQuotes(keys)
}

/**
 * Get stock quotes as a map keyed by symbol (e.g., "RELIANCE" → UpstoxQuote)
 * This is the recommended way to fetch quotes when you need to match back to symbols
 */
export async function getUpstoxStockQuotesMap(symbols?: string[]): Promise<Record<string, UpstoxQuote>> {
  const token = getAccessToken()
  if (!token) return {}

  const mapToUse = symbols
    ? Object.fromEntries(Object.entries(NSE_EQ_INSTRUMENT_MAP).filter(([k]) => symbols.includes(k)))
    : NSE_EQ_INSTRUMENT_MAP

  const keys = Object.values(mapToUse)
  if (keys.length === 0) return {}

  try {
    // URL-encode the instrument keys (pipe | needs to be %7C)
    const encodedKeys = keys.map(k => encodeURIComponent(k)).join(',')
    const res = await fetch(
      `${UPSTOX_API_V2}/market-quote/quotes?instrument_key=${encodedKeys}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(15000), // 15s timeout
      }
    )

    if (!res.ok) return {}
    const data = await res.json()
    if (!data?.data) return {}

    // Upstox response keys are in format "NSE_EQ:RELIANCE" (segment:symbol)
    // We need to match our symbol names to the response keys
    const result: Record<string, UpstoxQuote> = {}
    for (const [symbol, instrumentKey] of Object.entries(mapToUse)) {
      // Try multiple key formats: "NSE_EQ:SYMBOL", "NSE_INDEX:Nifty 50", and the pipe version
      const possibleKeys = [
        `${instrumentKey.replace('|', ':')}`,  // NSE_EQ:INE002A01018 (unlikely but check)
        instrumentKey,                          // NSE_EQ|INE002A01018 (pipe format)
      ]
      // Also try the segment:symbol format (most common in Upstox responses)
      const segment = instrumentKey.split('|')[0] // NSE_EQ, NSE_INDEX, BSE_INDEX
      const segmentSymbolKey = `${segment}:${symbol}`  // NSE_EQ:RELIANCE
      possibleKeys.unshift(segmentSymbolKey)

      let quoteData = null
      for (const key of possibleKeys) {
        if (data.data[key]) {
          quoteData = data.data[key]
          break
        }
      }
      if (quoteData) {
        result[symbol] = quoteData as UpstoxQuote
      }
    }

    return result
  } catch (err) {
    console.warn('[Upstox] Stock quotes map error:', err)
    return {}
  }
}

/**
 * Get index quotes as a map keyed by symbol (e.g., "NIFTY" → UpstoxQuote)
 */
export async function getUpstoxIndexQuotesMap(symbols?: string[]): Promise<Record<string, UpstoxQuote>> {
  const token = getAccessToken()
  if (!token) return {}

  const mapToUse = symbols
    ? Object.fromEntries(Object.entries(NSE_INDEX_INSTRUMENT_MAP).filter(([k]) => symbols.includes(k)))
    : NSE_INDEX_INSTRUMENT_MAP

  const keys = Object.values(mapToUse)
  if (keys.length === 0) return {}

  try {
    const encodedKeys = keys.map(k => encodeURIComponent(k)).join(',')
    const res = await fetch(
      `${UPSTOX_API_V2}/market-quote/quotes?instrument_key=${encodedKeys}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(15000), // 15s timeout
      }
    )

    if (!res.ok) return {}
    const data = await res.json()
    if (!data?.data) return {}

    // Upstox response keys for indices: "NSE_INDEX:Nifty 50", "NSE_INDEX:Nifty Bank", "BSE_INDEX:SENSEX"
    // Our instrument keys: "NSE_INDEX|Nifty 50", "NSE_INDEX|Nifty Bank", "BSE_INDEX|SENSEX"
    const result: Record<string, UpstoxQuote> = {}
    for (const [symbol, instrumentKey] of Object.entries(mapToUse)) {
      const possibleKeys = [
        instrumentKey.replace('|', ':'),  // NSE_INDEX:Nifty 50 (most likely!)
        instrumentKey,                    // NSE_INDEX|Nifty 50
      ]
      // Also try segment:symbol for index
      const segment = instrumentKey.split('|')[0]
      possibleKeys.unshift(`${segment}:${symbol}`)

      let quoteData = null
      for (const key of possibleKeys) {
        if (data.data[key]) {
          quoteData = data.data[key]
          break
        }
      }
      if (quoteData) {
        result[symbol] = quoteData as UpstoxQuote
      }
    }

    return result
  } catch (err) {
    console.warn('[Upstox] Index quotes map error:', err)
    return {}
  }
}

// ─── Yahoo Finance Fallback ──────────────────────────────────────────────

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
): Promise<UpstoxHistoricalCandle[]> {
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
      oi: 0,
    })).filter((c) => c.close > 0)
  } catch {
    return []
  }
}

// ─── Combined Data Fetchers ───────────────────────────────────────────────
// These try Upstox → Dhan → Yahoo Finance → DB fallback

export interface StockOverviewData {
  symbol: string
  name: string
  sector: string
  industry: string
  exchange: string
  isin: string | null

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

  week52High: number
  week52Low: number

  upperCircuit: number
  lowerCircuit: number

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

  lotSize: number
  isFuturesAvailable: boolean
  isOptionsAvailable: boolean
  isFnoBan: boolean
  strikeInterval: number | null

  deliveryQuantity: number | null
  deliveryPercentage: number | null
  vwap: number | null

  isRealData: boolean
  dataSource: 'upstox' | 'dhan' | 'yahoo' | 'database'
}

export interface IndexDetailData {
  symbol: string
  name: string
  currentPrice: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  previousClose: number
  volume: number
  week52High: number
  week52Low: number
  lotSize: number
  strikeInterval: number
  marketState: string
  exchange: string
  currency: string
  isRealData: boolean
  dataSource: 'upstox' | 'dhan' | 'yahoo' | 'fallback'
}

/**
 * Fetch comprehensive stock overview data
 * Priority: Upstox → Dhan → Yahoo Finance → DB
 */
export async function fetchStockOverviewData(symbol: string, dbStock: Record<string, unknown> | null): Promise<StockOverviewData> {
  const symbolUpper = symbol.toUpperCase()
  let dataSource: 'upstox' | 'dhan' | 'yahoo' | 'database' = 'database'
  let realtimeData: Partial<StockOverviewData> = {}

  // 1. Try Upstox API first
  if (isUpstoxAuthenticated()) {
    try {
      const upstoxQuote = await getUpstoxStockQuote(symbolUpper)
      if (upstoxQuote && upstoxQuote.last_price > 0) {
        dataSource = 'upstox'
        const previousClose = upstoxQuote.ohlc.close - upstoxQuote.net_change
        const changePercent = previousClose > 0 ? (upstoxQuote.net_change / previousClose) * 100 : 0
        realtimeData = {
          currentPrice: upstoxQuote.last_price,
          open: upstoxQuote.ohlc.open,
          high: upstoxQuote.ohlc.high,
          low: upstoxQuote.ohlc.low,
          close: upstoxQuote.ohlc.close,
          previousClose,
          change: upstoxQuote.net_change,
          changePercent,
          volume: upstoxQuote.volume || 0,
          averageTradePrice: upstoxQuote.average_price || 0,
          week52High: 0, // Not available in Upstox quote
          week52Low: 0,  // Not available in Upstox quote
          upperCircuit: upstoxQuote.upper_circuit_limit || 0,
          lowerCircuit: upstoxQuote.lower_circuit_limit || 0,
          isRealData: true,
        }
      }
    } catch (err) {
      console.warn(`[Upstox] Quote fetch failed for ${symbolUpper}:`, err)
    }
  }

  // 2. Try Dhan API if Upstox didn't work
  if (dataSource === 'database') {
    try {
      const { isDhanConfigured: isDhan, getDhanStockQuote } = await import('./dhan-api')
      if (isDhan()) {
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
    } catch (err) {
      console.warn(`[Dhan] Quote fetch failed for ${symbolUpper}:`, err)
    }
  }

  // 3. Try Yahoo Finance if still no data
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

  // 4. Merge with DB data
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
 * Fetch index detail data
 * Priority: Upstox → Yahoo Finance → Fallback
 */
// Alias map: common alternative names → canonical keys
const INDEX_ALIASES: Record<string, string> = {
  'NIFTY 50': 'NIFTY',
  'NIFTY50': 'NIFTY',
  'BANK NIFTY': 'BANKNIFTY',
  'BANKNIFTY': 'BANKNIFTY',
  'FIN NIFTY': 'FINNIFTY',
  'FINNIFTY': 'FINNIFTY',
  'MIDCAP NIFTY': 'MIDCPNIFTY',
  'MIDCAPNIFTY': 'MIDCPNIFTY',
  'NIFTY MIDCAP 150': 'MIDCPNIFTY',
  'NIFTY FINANCIAL SERVICES': 'FINNIFTY',
  'NIFTY BANK': 'BANKNIFTY',
}

function resolveIndexSymbol(symbol: string): string {
  const upper = symbol.toUpperCase()
  return INDEX_ALIASES[upper] || (INDEX_CONFIGS[upper] ? upper : upper)
}

export async function fetchIndexDetailData(symbol: string): Promise<IndexDetailData | null> {
  const resolvedSymbol = resolveIndexSymbol(symbol)
  const symbolUpper = resolvedSymbol.toUpperCase()
  const indexConfig = INDEX_CONFIGS[symbolUpper]
  if (!indexConfig) return null

  // 1. Try Upstox
  if (isUpstoxAuthenticated()) {
    try {
      const upstoxQuote = await getUpstoxIndexQuote(symbolUpper)
      if (upstoxQuote && upstoxQuote.last_price > 0) {
        const previousClose = upstoxQuote.ohlc.close - upstoxQuote.net_change
        const changePercent = previousClose > 0 ? (upstoxQuote.net_change / previousClose) * 100 : 0
        return {
          symbol: symbolUpper,
          name: indexConfig.name,
          currentPrice: upstoxQuote.last_price,
          change: upstoxQuote.net_change,
          changePercent,
          open: upstoxQuote.ohlc.open,
          high: upstoxQuote.ohlc.high,
          low: upstoxQuote.ohlc.low,
          previousClose,
          volume: upstoxQuote.volume || 0,
          week52High: 0,
          week52Low: 0,
          lotSize: indexConfig.lotSize,
          strikeInterval: indexConfig.strikeInterval,
          marketState: 'OPEN',
          exchange: 'NSE',
          currency: 'INR',
          isRealData: true,
          dataSource: 'upstox',
        }
      }
    } catch (err) {
      console.warn(`[Upstox] Index quote failed for ${symbolUpper}:`, err)
    }
  }

  // 2. Try Yahoo Finance
  try {
    const yahooSym = indexConfig.yahoo
    const res = await fetch(
      `${FINANCE_GATEWAY}${FINANCE_PREFIX}/v1/markets/quote?ticker=${encodeURIComponent(yahooSym)}&type=STOCKS`,
      { headers: { 'X-Z-AI-From': 'Z' }, next: { revalidate: 60 } }
    )

    if (res.ok) {
      const quoteData = await res.json()
      const body = quoteData?.body

      if (body) {
        const currentPrice = parseFloat(body.regularMarketPrice?.raw || body.regularMarketPrice || '0')
        const previousClose = parseFloat(body.regularMarketPreviousClose?.raw || body.regularMarketPreviousClose || '0')
        const change = currentPrice - previousClose
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

        return {
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
          dataSource: 'yahoo',
        }
      }
    }
  } catch (apiErr) {
    console.warn(`[Finance API] Index quote error for ${symbolUpper}:`, apiErr)
  }

  // 3. Fallback
  const fallback = INDEX_FALLBACK_DATA[symbolUpper]
  if (fallback) {
    return { ...fallback, isRealData: false, dataSource: 'fallback' }
  }

  return null
}

// ─── Index Configuration ────────────────────────────────────────────────

const INDEX_CONFIGS: Record<string, { yahoo: string; name: string; lotSize: number; strikeInterval: number }> = {
  NIFTY: { yahoo: '^NSEI', name: 'NIFTY 50', lotSize: 50, strikeInterval: 50 },
  BANKNIFTY: { yahoo: '^NSEBANK', name: 'BANK NIFTY', lotSize: 25, strikeInterval: 100 },
  SENSEX: { yahoo: '^BSESN', name: 'SENSEX', lotSize: 15, strikeInterval: 100 },
  FINNIFTY: { yahoo: '^CRSLDX', name: 'FINNIFTY', lotSize: 40, strikeInterval: 50 },
  MIDCPNIFTY: { yahoo: '^NSMIDCP', name: 'MIDCAP NIFTY', lotSize: 75, strikeInterval: 50 },
}

const INDEX_FALLBACK_DATA: Record<string, IndexDetailData> = {
  NIFTY: { symbol: 'NIFTY', name: 'NIFTY 50', currentPrice: 22456.80, change: 142.30, changePercent: 0.64, open: 22350.00, high: 22510.45, low: 22310.20, previousClose: 22314.50, volume: 285600000, week52High: 24234.00, week52Low: 19170.00, lotSize: 50, strikeInterval: 50, marketState: 'CLOSED', exchange: 'NSE', currency: 'INR', isRealData: false, dataSource: 'fallback' },
  BANKNIFTY: { symbol: 'BANKNIFTY', name: 'BANK NIFTY', currentPrice: 47210.45, change: -82.10, changePercent: -0.17, open: 47350.00, high: 47480.30, low: 47050.60, previousClose: 47292.55, volume: 198400000, week52High: 51945.00, week52Low: 39450.00, lotSize: 25, strikeInterval: 100, marketState: 'CLOSED', exchange: 'NSE', currency: 'INR', isRealData: false, dataSource: 'fallback' },
  SENSEX: { symbol: 'SENSEX', name: 'SENSEX', currentPrice: 73645.25, change: 450.15, changePercent: 0.61, open: 73250.00, high: 73810.50, low: 73180.30, previousClose: 73195.10, volume: 312000000, week52High: 79840.00, week52Low: 62830.00, lotSize: 15, strikeInterval: 100, marketState: 'CLOSED', exchange: 'BSE', currency: 'INR', isRealData: false, dataSource: 'fallback' },
  FINNIFTY: { symbol: 'FINNIFTY', name: 'FINNIFTY', currentPrice: 21150.75, change: 85.75, changePercent: 0.41, open: 21080.00, high: 21220.40, low: 21050.10, previousClose: 21065.00, volume: 45200000, week52High: 22980.00, week52Low: 18350.00, lotSize: 40, strikeInterval: 50, marketState: 'CLOSED', exchange: 'NSE', currency: 'INR', isRealData: false, dataSource: 'fallback' },
  MIDCPNIFTY: { symbol: 'MIDCPNIFTY', name: 'MIDCAP NIFTY', currentPrice: 51250.10, change: 40.10, changePercent: 0.08, open: 51200.00, high: 51380.50, low: 51100.30, previousClose: 51210.00, volume: 78500000, week52High: 56890.00, week52Low: 42350.00, lotSize: 75, strikeInterval: 50, marketState: 'CLOSED', exchange: 'NSE', currency: 'INR', isRealData: false, dataSource: 'fallback' },
}
