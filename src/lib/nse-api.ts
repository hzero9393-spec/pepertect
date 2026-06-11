// ─── NSE India API Integration ──────────────────────────────────────────────
// Provides option chain data directly from NSE India (https://www.nseindia.com)
// This is the PRIMARY data source for option chain data (free, no auth needed)
//
// NSE blocks direct requests, so we need to:
// 1. First fetch the homepage to get cookies
// 2. Then use those cookies + specific headers for API calls
//
// Indices: https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY
// Stocks:  https://www.nseindia.com/api/option-chain-equities?symbol=RELIANCE

// ─── Types ────────────────────────────────────────────────────────────────

export interface NSEOptionData {
  strikePrice: number
  expiryDate: string       // "YYYY-MM-DD" format (converted from NSE's "DD-Mon-YYYY")
  ce: {
    ltp: number
    change: number
    changePercent: number
    volume: number
    openInterest: number
    oiChange: number
    oiChangePercent: number
    impliedVolatility: number
    delta: number
    gamma: number
    theta: number
    vega: number
    bidPrice: number
    askPrice: number
  } | null
  pe: {
    ltp: number
    change: number
    changePercent: number
    volume: number
    openInterest: number
    oiChange: number
    oiChangePercent: number
    impliedVolatility: number
    delta: number
    gamma: number
    theta: number
    vega: number
    bidPrice: number
    askPrice: number
  } | null
}

export interface NSEOptionChain {
  symbol: string
  spot: number
  expiries: string[]         // Available expiry dates in "YYYY-MM-DD" format
  chain: NSEOptionData[]
  pcr: number
  maxPain: number
  isRealData: boolean
  dataSource: 'nse'
  fetchedAt: number          // Timestamp when data was fetched
}

// ─── Internal NSE Response Types ──────────────────────────────────────────

interface NSERawOptionSide {
  strikePrice: number
  expiryDate: string         // "DD-Mon-YYYY"
  openInterest: number
  changeinOpenInterest: number
  pchangeinOpenInterest: number
  totalTradedVolume: number
  impliedVolatility: number
  lastPrice: number
  change: number
  pChange: number
  totalBuyQuantity: number
  totalSellQuantity: number
  bidQty: number
  bidprice: number
  askQty: number
  askPrice: number
  underlyingValue: number
}

interface NSERawOptionRow {
  strikePrice: number
  expiryDate: string
  PE?: NSERawOptionSide
  CE?: NSERawOptionSide
}

interface NSERawResponse {
  records?: {
    expiryDates?: string[]
    data?: NSERawOptionRow[]
    underlyingValue?: number
  }
  filtered?: {
    data?: NSERawOptionRow[]
  }
}

// ─── Constants ────────────────────────────────────────────────────────────

const NSE_BASE_URL = 'https://www.nseindia.com'
const NSE_INDICES_API = `${NSE_BASE_URL}/api/option-chain-indices`
const NSE_EQUITIES_API = `${NSE_BASE_URL}/api/option-chain-equities`

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nseindia.com/option-chain',
}

// Index symbol mapping for NSE API
const NSE_INDEX_SYMBOL_MAP: Record<string, string> = {
  NIFTY: 'NIFTY',
  BANKNIFTY: 'BANKNIFTY',
  FINNIFTY: 'FINNIFTY',
  MIDCPNIFTY: 'MIDCPNIFTY',
  // SENSEX is not available on NSE
}

// Cache TTL: 5 seconds
const CACHE_TTL_MS = 5000

// Request timeout: 5 seconds (short to avoid server hanging)
const REQUEST_TIMEOUT_MS = 5000

// ─── In-Memory Cache ─────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const nseCache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const entry = nseCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    nseCache.delete(key)
    return null
  }
  return entry.value as T
}

function setCache<T>(key: string, value: T, ttlMs: number = CACHE_TTL_MS): void {
  nseCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  })
}

// Cookie Management ───────────────────────────────────────────────────

let cachedCookies: string | null = null
let cookieFetchTime = 0
const COOKIE_TTL_MS = 5 * 60 * 1000 // Refresh cookies every 5 minutes

// Track if NSE is blocked (skip future attempts)
let nseBlocked = false
let nseBlockedTime = 0
const NSE_BLOCK_COOLDOWN_MS = 5 * 60 * 1000 // Retry after 5 minutes

/**
 * Fetch cookies from NSE homepage - required for subsequent API calls
 */
async function fetchNSECookies(): Promise<string> {
  // Return cached cookies if still valid
  if (cachedCookies && Date.now() - cookieFetchTime < COOKIE_TTL_MS) {
    return cachedCookies
  }

  try {
    const response = await fetch(NSE_BASE_URL, {
      headers: NSE_HEADERS,
      signal: AbortSignal.timeout(3000), // Short timeout for homepage
      redirect: 'follow',
    })

    // Extract Set-Cookie headers
    const setCookieHeaders = response.headers.getSetCookie()
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      // Parse cookies from Set-Cookie headers (take just the name=value part)
      const cookies = setCookieHeaders.map((cookie: string) => {
        const parts = cookie.split(';')
        return parts[0]?.trim() || ''
      }).filter(Boolean)

      cachedCookies = cookies.join('; ')
      cookieFetchTime = Date.now()
      return cachedCookies
    }

    // If no Set-Cookie, return empty - NSE may be blocking
    return ''
  } catch (err) {
    // Don't log - this is expected in server environments
    return cachedCookies || ''
  }
}

// ─── Date Format Conversion ──────────────────────────────────────────────

/**
 * Convert NSE date format "DD-Mon-YYYY" (e.g., "05-Mar-2026") to "YYYY-MM-DD" (e.g., "2026-03-05")
 */
function convertNSEDate(dateStr: string): string {
  if (!dateStr) return ''

  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

  try {
    const months: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
    }

    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr

    const day = parts[0].padStart(2, '0')
    const month = months[parts[1]]
    const year = parts[2]

    if (!month) return dateStr
    return `${year}-${month}-${day}`
  } catch {
    return dateStr
  }
}

// ─── Data Transformation ─────────────────────────────────────────────────

/**
 * Transform a raw NSE option side (CE or PE) to our internal format
 */
function transformOptionSide(raw: NSERawOptionSide): NSEOptionData['ce'] {
  if (!raw) return null

  return {
    ltp: raw.lastPrice || 0,
    change: raw.change || 0,
    changePercent: raw.pChange || 0,
    volume: raw.totalTradedVolume || 0,
    openInterest: raw.openInterest || 0,
    oiChange: raw.changeinOpenInterest || 0,
    oiChangePercent: raw.pchangeinOpenInterest || 0,
    impliedVolatility: raw.impliedVolatility || 0,
    // NSE does not provide Greeks - default to 0
    delta: 0,
    gamma: 0,
    theta: 0,
    vega: 0,
    bidPrice: raw.bidprice || 0,
    askPrice: raw.askPrice || 0,
  }
}

// ─── PCR & Max Pain Calculation ──────────────────────────────────────────

/**
 * Calculate Put-Call Ratio from option chain data
 */
function calculatePCR(chain: NSEOptionData[]): number {
  let totalCEOI = 0
  let totalPEOI = 0

  for (const item of chain) {
    if (item.ce) totalCEOI += item.ce.openInterest
    if (item.pe) totalPEOI += item.pe.openInterest
  }

  return totalCEOI > 0 ? Math.round((totalPEOI / totalCEOI) * 100) / 100 : 0
}

/**
 * Calculate Max Pain from option chain data
 * Max Pain = strike price where total loss to option writers is minimum
 */
function calculateMaxPain(chain: NSEOptionData[]): number {
  if (chain.length === 0) return 0

  const strikes = chain.map(item => item.strikePrice)
  let maxPain = strikes[0] || 0
  let minLoss = Infinity

  for (const strike of strikes) {
    let totalLoss = 0
    for (const item of chain) {
      // CE holders lose money when spot > strike (intrinsic = max(spot - strike, 0))
      // Loss to CE writers = max(spot - CE strike, 0) * CE OI
      if (item.ce) {
        totalLoss += Math.max(strike - item.strikePrice, 0) * item.ce.openInterest
      }
      // PE holders lose money when spot < strike (intrinsic = max(strike - spot, 0))
      // Loss to PE writers = max(PE strike - spot, 0) * PE OI
      if (item.pe) {
        totalLoss += Math.max(item.strikePrice - strike, 0) * item.pe.openInterest
      }
    }
    if (totalLoss < minLoss) {
      minLoss = totalLoss
      maxPain = strike
    }
  }

  return maxPain
}

// ─── Core API Functions ──────────────────────────────────────────────────

/**
 * Make an authenticated request to NSE API with cookie handling
 */
async function nseFetch(url: string): Promise<NSERawResponse | null> {
  try {
    // Step 1: Get cookies (cached, or skip if blocked)
    const cookies = await fetchNSECookies()

    // Step 2: Make the API call with cookies and headers
    const headers: Record<string, string> = {
      ...NSE_HEADERS,
    }

    if (cookies) {
      headers['Cookie'] = cookies
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: 'follow',
    })

    if (!response.ok) {
      // If we get a 401/403, invalidate cookies and mark as blocked
      if (response.status === 401 || response.status === 403) {
        cachedCookies = null
        cookieFetchTime = 0
        nseBlocked = true
        nseBlockedTime = Date.now()
      }

      return null
    }

    const text = await response.text()

    // NSE sometimes returns HTML error pages instead of JSON
    if (!text.trim().startsWith('{')) {
      // Invalidate cookies
      cachedCookies = null
      cookieFetchTime = 0
      nseBlocked = true
      nseBlockedTime = Date.now()
      return null
    }

    const data = JSON.parse(text) as NSERawResponse

    // Update cookies from response
    const newCookies = response.headers.getSetCookie()
    if (newCookies && newCookies.length > 0) {
      const cookieParts = newCookies.map((cookie: string) => {
        const parts = cookie.split(';')
        return parts[0]?.trim() || ''
      }).filter(Boolean)
      cachedCookies = cookieParts.join('; ')
      cookieFetchTime = Date.now()
    }

    return data
  } catch (err) {
    // Timeout errors are expected - don't log them
    const isTimeout = err instanceof Error && err.name === 'TimeoutError'
    if (!isTimeout) {
      // Mark as blocked on any error
      nseBlocked = true
      nseBlockedTime = Date.now()
    }
    return null
  }
}

/**
 * Transform raw NSE response to our internal NSEOptionChain format
 */
function transformNSEResponse(
  raw: NSERawResponse,
  symbol: string
): NSEOptionChain | null {
  const records = raw.records
  if (!records || !records.data || records.data.length === 0) {
    return null
  }

  // Convert expiry dates
  const expiries = (records.expiryDates || [])
    .map(convertNSEDate)
    .filter(Boolean)

  // Get underlying/spot price
  const spot = records.underlyingValue ||
    records.data[0]?.CE?.underlyingValue ||
    records.data[0]?.PE?.underlyingValue ||
    0

  // Transform each row in the option chain
  const chain: NSEOptionData[] = records.data
    .map((row: NSERawOptionRow): NSEOptionData => ({
      strikePrice: row.strikePrice,
      expiryDate: convertNSEDate(row.expiryDate),
      ce: row.CE ? transformOptionSide(row.CE) : null,
      pe: row.PE ? transformOptionSide(row.PE) : null,
    }))
    .filter((item: NSEOptionData) => item.ce !== null || item.pe !== null)

  if (chain.length === 0) return null

  // Calculate PCR and Max Pain
  const pcr = calculatePCR(chain)
  const maxPain = calculateMaxPain(chain)

  return {
    symbol,
    spot,
    expiries,
    chain,
    pcr,
    maxPain,
    isRealData: true,
    dataSource: 'nse',
    fetchedAt: Date.now(),
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Check if NSE is available (always true - it's a free public API)
 */
export function isNSEAvailable(): boolean {
  return true
}

/**
 * Get option chain for an index from NSE India
 * @param symbol Index symbol (NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY)
 * @returns NSEOptionChain or null if fetch fails
 */
export async function getNSEIndexOptionChain(symbol: string): Promise<NSEOptionChain | null> {
  const symbolUpper = symbol.toUpperCase()

  // Check symbol mapping - SENSEX is not available on NSE
  const nseSymbol = NSE_INDEX_SYMBOL_MAP[symbolUpper]
  if (!nseSymbol) {
    return null
  }

  // Skip NSE if blocked recently
  if (nseBlocked && Date.now() - nseBlockedTime < NSE_BLOCK_COOLDOWN_MS) {
    return null
  }

  // Check cache
  const cacheKey = `nse:index:${nseSymbol}`
  const cached = getCached<NSEOptionChain>(cacheKey)
  if (cached) return cached

  // Fetch from NSE
  const url = `${NSE_INDICES_API}?symbol=${encodeURIComponent(nseSymbol)}`
  const raw = await nseFetch(url)

  if (!raw) {
    // Mark NSE as blocked to skip future attempts
    nseBlocked = true
    nseBlockedTime = Date.now()
    return null
  }

  const result = transformNSEResponse(raw, symbolUpper)
  if (result) {
    setCache(cacheKey, result)
    nseBlocked = false // Reset block on success
  }

  return result
}

/**
 * Get option chain for a stock from NSE India
 * @param symbol Stock symbol (e.g., RELIANCE, TCS, HDFCBANK)
 * @returns NSEOptionChain or null if fetch fails
 */
export async function getNSEStockOptionChain(symbol: string): Promise<NSEOptionChain | null> {
  const symbolUpper = symbol.toUpperCase()

  // Check cache
  const cacheKey = `nse:stock:${symbolUpper}`
  const cached = getCached<NSEOptionChain>(cacheKey)
  if (cached) return cached

  // Fetch from NSE
  const url = `${NSE_EQUITIES_API}?symbol=${encodeURIComponent(symbolUpper)}`
  const raw = await nseFetch(url)

  if (!raw) return null

  const result = transformNSEResponse(raw, symbolUpper)
  if (result) {
    setCache(cacheKey, result)
  }

  return result
}

/**
 * Get available expiry dates for an index from NSE India
 * @param symbol Index symbol (NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY)
 * @returns Array of expiry dates in "YYYY-MM-DD" format
 */
export async function getNSEIndexExpiries(symbol: string): Promise<string[]> {
  const chain = await getNSEIndexOptionChain(symbol)
  return chain?.expiries || []
}

/**
 * Get available expiry dates for a stock from NSE India
 * @param symbol Stock symbol (e.g., RELIANCE)
 * @returns Array of expiry dates in "YYYY-MM-DD" format
 */
export async function getNSEStockExpiries(symbol: string): Promise<string[]> {
  const chain = await getNSEStockOptionChain(symbol)
  return chain?.expiries || []
}

/**
 * Get option chain for any symbol (auto-detects index vs stock)
 * @param symbol Symbol name
 * @returns NSEOptionChain or null if fetch fails or symbol not supported
 */
export async function getNSEOptionChain(symbol: string): Promise<NSEOptionChain | null> {
  const symbolUpper = symbol.toUpperCase()

  // Try as index first
  if (NSE_INDEX_SYMBOL_MAP[symbolUpper]) {
    return getNSEIndexOptionChain(symbolUpper)
  }

  // Otherwise treat as stock
  return getNSEStockOptionChain(symbolUpper)
}

/**
 * Clear the NSE cache (useful when forcing a refresh)
 */
export function clearNSECache(): void {
  nseCache.clear()
  cachedCookies = null
  cookieFetchTime = 0
}
