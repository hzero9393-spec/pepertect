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

// Upstox v2 option chain response format
export interface UpstoxOptionChainItem {
  expiry: string
  pcr: number
  strike_price: number
  underlying_key: string
  underlying_spot_price: number
  call_options: {
    instrument_key: string
    market_data: {
      ltp: number
      volume: number
      oi: number
      close_price: number
      bid_price: number
      bid_qty: number
      ask_price: number
      ask_qty: number
      prev_oi: number
    }
    option_greeks: {
      vega: number
      theta: number
      gamma: number
      delta: number
      iv: number
      pop: number
    }
  } | null
  put_options: {
    instrument_key: string
    market_data: {
      ltp: number
      volume: number
      oi: number
      close_price: number
      bid_price: number
      bid_qty: number
      ask_price: number
      ask_qty: number
      prev_oi: number
    }
    option_greeks: {
      vega: number
      theta: number
      gamma: number
      delta: number
      iv: number
      pop: number
    }
  } | null
}

export interface UpstoxOptionChain {
  underlying_spot_price?: number
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

  // ─── Extended NSE Stocks ─────────────────────────────────────────────────
  LICI: 'NSE_EQ|INE051L01022',
  YESBANK: 'NSE_EQ|INE528G01035',
  IDFCFIRSTB: 'NSE_EQ|INE092W01024',
  PNB: 'NSE_EQ|INE160A01015',
  BANKBARODA: 'NSE_EQ|INE028A01023',
  CANBK: 'NSE_EQ|INE476A01014',
  BANKINDIA: 'NSE_EQ|INE004A01021',
  UNIONBANK: 'NSE_EQ|INE737C01016',
  INDIANB: 'NSE_EQ|INE569A01029',
  IDBI: 'NSE_EQ|INE087B01014',
  SOUTHBANK: 'NSE_EQ|INE058G01012',
  KTKBANK: 'NSE_EQ|INE797A01012',
  CUB: 'NSE_EQ|INE585B01016',
  DCBBANK: 'NSE_EQ|INE605D01014',
  RBLBANK: 'NSE_EQ|INE874R01013',
  SHRIRAMFIN: 'NSE_EQ|INE745A01023',
  'M&MFIN': 'NSE_EQ|INE488C01012',
  CHOLAFIN: 'NSE_EQ|INE324A01012',
  'L&TFH': 'NSE_EQ|INE018C01026',
  IDFC: 'NSE_EQ|INE047D01021',
  BAJAJHLDNG: 'NSE_EQ|INE298A01023',
  ADANIPOWER: 'NSE_EQ|INE414E01016',
  JSWENERGY: 'NSE_EQ|INE149I01012',
  SUZLON: 'NSE_EQ|INE040D01025',
  ADANIGREEN: 'NSE_EQ|INE455U01013',
  ADANITRANS: 'NSE_EQ|INE925H01016',
  ADANIGAS: 'NSE_EQ|INE894U01014',
  AWL: 'NSE_EQ|INE984H01012',
  HINDPETRO: 'NSE_EQ|INE094A01023',
  OIL: 'NSE_EQ|INE274J01014',
  GAIL: 'NSE_EQ|INE129B01018',
  PETRONET: 'NSE_EQ|INE267F01011',
  GUJGASLTD: 'NSE_EQ|INE057G01012',
  IGL: 'NSE_EQ|INE206C01011',
  MGL: 'NSE_EQ|INE023R01011',
  IOC: 'NSE_EQ|INE241A01010',
  JSL: 'NSE_EQ|INE247B01021',
  SAIL: 'NSE_EQ|INE114A01011',
  NMDC: 'NSE_EQ|INE462B01014',
  MOIL: 'NSE_EQ|INE563B01012',
  VEDL: 'NSE_EQ|INE205A01024',
  HINDZINC: 'NSE_EQ|INE073A01018',
  JINDALSTEL: 'NSE_EQ|INE204B01017',
  NATIONALUM: 'NSE_EQ|INE139B01012',
  HINDCOPPER: 'NSE_EQ|INE531B01012',
  APLAPOLLO: 'NSE_EQ|INE279M01012',
  RATNAMANI: 'NSE_EQ|INE078C01015',
  'BAJAJ-AUTO': 'NSE_EQ|INE269A01018',
  TVSMOTOR: 'NSE_EQ|INE467D01014',
  ASHOKLEY: 'NSE_EQ|INE269A01026',
  MOTHERSON: 'NSE_EQ|INE769A01021',
  EXIDEIND: 'NSE_EQ|INE049C01016',
  AMARAJABAT: 'NSE_EQ|INE874A01012',
  BOSCHLTD: 'NSE_EQ|INE354A01012',
  MRF: 'NSE_EQ|INE883A01011',
  APOLLOTYRE: 'NSE_EQ|INE439A01019',
  CEATLTD: 'NSE_EQ|INE485A01015',
  JKTYRE: 'NSE_EQ|INE541C01012',
  BHARATFORG: 'NSE_EQ|INE481A01018',
  BERGERPAINT: 'NSE_EQ|INE453B01014',
  AKZOINDIA: 'NSE_EQ|INE036A01018',
  KANSAINER: 'NSE_EQ|INE549B01012',
  IDEA: 'NSE_EQ|INE324A01026',
  GMRINFRA: 'NSE_EQ|INE245B01014',
  ALOKINDS: 'NSE_EQ|INE060H01015',
  CENTURYTEX: 'NSE_EQ|INE047A01020',
  TRIDENT: 'NSE_EQ|INE338B01012',
  VARDHMAN: 'NSE_EQ|INE510C01018',
  ARVIND: 'NSE_EQ|INE077A01017',
  RAYMOND: 'NSE_EQ|INE126A01016',
  PAGEIND: 'NSE_EQ|INE176H01011',
  KPRMILL: 'NSE_EQ|INE150K01012',
  LUXIND: 'NSE_EQ|INE660H01012',
  WELSPUNIND: 'NSE_EQ|INE180B01023',
  TRENT: 'NSE_EQ|INE849A01017',
  ABFRL: 'NSE_EQ|INE065L01013',
  DMART: 'NSE_EQ|INE407L01015',
  SHREECEM: 'NSE_EQ|INE070A01013',
  HAL: 'NSE_EQ|INE095F01014',
  GODREJCP: 'NSE_EQ|INE193C01024',
  DABUR: 'NSE_EQ|INE017A01026',
  COLPAL: 'NSE_EQ|INE259A01012',
  PGHH: 'NSE_EQ|INE186B01014',
  EMAMILTD: 'NSE_EQ|INE365B01014',
  MARICO: 'NSE_EQ|INE196A01026',
  VBL: 'NSE_EQ|INE749L01014',
  JUBLFOOD: 'NSE_EQ|INE396G01014',
  WESTLIFE: 'NSE_EQ|INE306C01013',
  DEVYANI: 'NSE_EQ|INE01T601012',
  SAPPHIRE: 'NSE_EQ|INE01SY01014',
  BARBEQUE: 'NSE_EQ|INE01Q501017',
  SPECIALLTY: 'NSE_EQ|INE937L01013',
  INDIGOPNT: 'NSE_EQ|INE01S801013',
  SHALPAINTS: 'NSE_EQ|INE269C01017',
  RBA: 'NSE_EQ|INE00Y501014',
  FORCEMOT: 'NSE_EQ|INE157A01016',
  GODAWARI: 'NSE_EQ|INE705C01014',
  LLOYDSME: 'NSE_EQ|INE939L01014',
}

export const NSE_INDEX_INSTRUMENT_MAP: Record<string, string> = {
  NIFTY: 'NSE_INDEX|Nifty 50',
  BANKNIFTY: 'NSE_INDEX|Nifty Bank',
  FINNIFTY: 'NSE_INDEX|Nifty Fin Service',
  SENSEX: 'BSE_INDEX|SENSEX',
  MIDCPNIFTY: 'NSE_INDEX|NIFTY MIDCAP 150',
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function getApiKey(): string | null {
  return process.env.UPSTOX_API_KEY || null
}

function getApiSecret(): string | null {
  return process.env.UPSTOX_API_SECRET || null
}

// In-memory token cache to avoid DB reads on every API call
let cachedAccessToken: string | null = null
let tokenCacheExpiry = 0
const TOKEN_CACHE_TTL = 5 * 60 * 1000 // 5 min cache

async function getAccessToken(): Promise<string | null> {
  // 1. Check cache first
  if (cachedAccessToken && Date.now() < tokenCacheExpiry) {
    return cachedAccessToken
  }

  // 2. Check env var
  if (process.env.UPSTOX_ACCESS_TOKEN) {
    cachedAccessToken = process.env.UPSTOX_ACCESS_TOKEN
    tokenCacheExpiry = Date.now() + TOKEN_CACHE_TTL
    return cachedAccessToken
  }

  // 3. Check DB
  try {
    const { db } = await import('@/lib/db')
    const tokenRecord = await db.platformSettings.findUnique({
      where: { key: 'upstox_access_token' }
    })
    if (tokenRecord?.value) {
      cachedAccessToken = tokenRecord.value
      tokenCacheExpiry = Date.now() + TOKEN_CACHE_TTL
      return cachedAccessToken
    }
  } catch {}

  return null
}

export function isUpstoxConfigured(): boolean {
  return !!(getApiKey() && getApiSecret())
}

export async function isUpstoxAuthenticated(): Promise<boolean> {
  const token = await getAccessToken()
  return !!token
}

/**
 * Refresh the Upstox access token using the stored refresh token
 */
export async function refreshUpstoxAccessToken(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  const apiKey = getApiKey()
  const apiSecret = getApiSecret()
  if (!apiKey || !apiSecret) {
    return { success: false, error: 'Upstox API credentials not configured' }
  }

  // Get refresh token from DB
  let refreshToken: string | null = null
  try {
    const { db } = await import('@/lib/db')
    const record = await db.platformSettings.findUnique({
      where: { key: 'upstox_refresh_token' }
    })
    refreshToken = record?.value || null
  } catch {}

  if (!refreshToken) {
    return { success: false, error: 'No refresh token available' }
  }

  try {
    const res = await fetch(`${UPSTOX_API_V2}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: apiKey,
        client_secret: apiSecret,
        grant_type: 'refresh_token',
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('[Upstox] Token refresh failed:', error)
      return { success: false, error: `Refresh failed: ${error}` }
    }

    const data = await res.json()
    const newAccessToken = data?.data?.access_token
    const newRefreshToken = data?.data?.refresh_token

    if (!newAccessToken) {
      return { success: false, error: 'No access token in refresh response' }
    }

    // Store new tokens in DB
    try {
      const { db } = await import('@/lib/db')
      await db.platformSettings.upsert({
        where: { key: 'upstox_access_token' },
        update: { value: newAccessToken },
        create: { key: 'upstox_access_token', value: newAccessToken, description: 'Upstox API OAuth2 access token' },
      })

      if (newRefreshToken) {
        await db.platformSettings.upsert({
          where: { key: 'upstox_refresh_token' },
          update: { value: newRefreshToken },
          create: { key: 'upstox_refresh_token', value: newRefreshToken, description: 'Upstox API OAuth2 refresh token' },
        })
      }

      // Also store token obtained timestamp
      await db.platformSettings.upsert({
        where: { key: 'upstox_token_obtained_at' },
        update: { value: new Date().toISOString() },
        create: { key: 'upstox_token_obtained_at', value: new Date().toISOString(), description: 'Timestamp when Upstox token was last obtained/refreshed' },
      })
    } catch (dbErr) {
      console.error('[Upstox] Failed to store refreshed tokens:', dbErr)
    }

    // Update cache
    cachedAccessToken = newAccessToken
    tokenCacheExpiry = Date.now() + TOKEN_CACHE_TTL

    console.log('[Upstox] Token refreshed successfully')
    return { success: true, accessToken: newAccessToken }
  } catch (err) {
    console.error('[Upstox] Token refresh error:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Ensure a valid token is available, auto-refreshing if expired
 */
export async function ensureValidToken(): Promise<string | null> {
  // Get current token
  let token = await getAccessToken()

  if (!token) {
    // No token at all, try refresh
    const result = await refreshUpstoxAccessToken()
    return result.success ? result.accessToken || null : null
  }

  // Check if token might be expired (check DB for timestamp)
  try {
    const { db } = await import('@/lib/db')
    const obtainedAt = await db.platformSettings.findUnique({
      where: { key: 'upstox_token_obtained_at' }
    })

    if (obtainedAt?.value) {
      const obtainedTime = new Date(obtainedAt.value).getTime()
      const elapsed = Date.now() - obtainedTime
      const TOKEN_EXPIRY_MS = 23 * 60 * 60 * 1000 // 23 hours (1 hour buffer before 24h expiry)

      if (elapsed > TOKEN_EXPIRY_MS) {
        console.log('[Upstox] Token likely expired (obtained', Math.round(elapsed / 3600000), 'hours ago), refreshing...')
        const result = await refreshUpstoxAccessToken()
        if (result.success) {
          return result.accessToken || null
        }
        // If refresh fails, still try with existing token
        console.warn('[Upstox] Token refresh failed, trying with existing token')
      }
    }
  } catch {}

  return token
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
  const token = await getAccessToken()
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
  const token = await ensureValidToken()
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
        cache: 'no-store',
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
  const token = await getAccessToken()
  if (!token || instrumentKeys.length === 0) return []

  try {
    const res = await fetch(
      `${UPSTOX_API_V2}/market-quote/ohlc?instrument_key=${instrumentKeys.join(',')}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
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
 * Get option chain from Upstox v2 API
 * NOTE: expiry_date is REQUIRED by the Upstox API
 * If not provided, we first fetch available expiries and use the nearest one
 */
export async function getUpstoxOptionChain(
  underlyingInstrumentKey: string,
  expiryDate?: string
): Promise<UpstoxOptionChain | null> {
  const token = await ensureValidToken()
  if (!token) return null

  try {
    // If no expiry provided, calculate the nearest monthly expiry (last Thursday of current/next month)
    let expiry = expiryDate
    if (!expiry) {
      const now = new Date()
      // Try last Thursday of current month first
      for (let m = 0; m < 3; m++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() + m + 1, 0)
        while (monthDate.getDay() !== 4) {
          monthDate.setDate(monthDate.getDate() - 1)
        }
        if (monthDate.getTime() >= now.getTime() - 86400000) {
          expiry = monthDate.toISOString().split('T')[0]
          break
        }
      }
      if (!expiry) return null
    }

    const url = `${UPSTOX_API_V2}/option/chain?instrument_key=${encodeURIComponent(underlyingInstrumentKey)}&expiry_date=${expiry}`

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.warn(`[Upstox] Option chain API returned ${res.status} for ${underlyingInstrumentKey}`)
      return null
    }
    const data = await res.json()
    if (data?.status === 'error') {
      console.warn(`[Upstox] Option chain API error:`, data.errors)
      return null
    }

    const chainData = data?.data
    if (!Array.isArray(chainData) || chainData.length === 0) return null

    // Transform to our internal format - extract spot price from first item
    const spotPrice = chainData[0]?.underlying_spot_price || 0

    return {
      underlying_spot_price: spotPrice,
      option_chain: chainData as UpstoxOptionChainItem[],
    }
  } catch (err) {
    console.warn(`[Upstox] Option chain error:`, err)
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
  const token = await getAccessToken()
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
 * Tries likely NSE expiry dates in parallel to discover available expiries efficiently
 */
export async function getUpstoxExpiries(underlyingInstrumentKey: string): Promise<string[]> {
  const token = await getAccessToken()
  if (!token) return []

  try {
    // Generate likely NSE expiry dates (Thursdays)
    const now = new Date()
    const candidateDates: string[] = []

    // Generate next 12 Thursdays for weekly options
    for (let i = 0; i < 12; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + (i * 7))
      const day = date.getDay()
      const daysUntilThursday = ((4 - day + 7) % 7)
      date.setDate(date.getDate() + daysUntilThursday)
      const dateStr = date.toISOString().split('T')[0]
      if (!candidateDates.includes(dateStr)) {
        candidateDates.push(dateStr)
      }
    }

    // Add last Thursday of each month for next 6 months
    for (let m = 0; m < 6; m++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + m + 1, 0)
      while (monthDate.getDay() !== 4) {
        monthDate.setDate(monthDate.getDate() - 1)
      }
      const dateStr = monthDate.toISOString().split('T')[0]
      if (!candidateDates.includes(dateStr)) {
        candidateDates.push(dateStr)
      }
    }

    // Try all candidate dates in parallel (with concurrency limit)
    const BATCH_SIZE = 6
    const validExpiries: string[] = []

    for (let i = 0; i < candidateDates.length; i += BATCH_SIZE) {
      const batch = candidateDates.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map(async (dateStr) => {
          const url = `${UPSTOX_API_V2}/option/chain?instrument_key=${encodeURIComponent(underlyingInstrumentKey)}&expiry_date=${dateStr}`
          const res = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(8000),
          })
          if (res.ok) {
            const data = await res.json()
            if (data?.status === 'success' && Array.isArray(data?.data) && data.data.length > 0) {
              return dateStr
            }
          }
          return null
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          validExpiries.push(result.value)
        }
      }

      if (validExpiries.length >= 8) break
    }

    return validExpiries.sort()
  } catch {
    return []
  }
}

// ─── Market Data - Multi-index Quotes ──────────────────────────────────

/**
 * Get all configured index quotes from Upstox
 */
export async function getUpstoxAllIndexQuotes(): Promise<UpstoxQuote[]> {
  // ensureValidToken is called inside getUpstoxQuotes, but we also check here
  // to avoid the overhead of fetching keys if no token is available
  const token = await ensureValidToken()
  if (!token) return []
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
  const token = await getAccessToken()
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
        cache: 'no-store',
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
  const token = await getAccessToken()
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
        cache: 'no-store',
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
      { headers: { 'X-Z-AI-From': 'Z' }, cache: 'no-store' }
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
      { headers: { 'X-Z-AI-From': 'Z' }, cache: 'no-store' }
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
  if (await isUpstoxAuthenticated()) {
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
  if (await isUpstoxAuthenticated()) {
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
      { headers: { 'X-Z-AI-From': 'Z' }, cache: 'no-store' }
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
