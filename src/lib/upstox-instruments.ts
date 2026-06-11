// ─── Upstox Instruments Service ─────────────────────────────────────────────
// Discovers expiry dates by probing the Upstox Option Chain API with candidate dates.
// The master CSV is access-restricted, so we use the API directly.

import { NSE_INDEX_INSTRUMENT_MAP } from './upstox-api'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// ─── Types ────────────────────────────────────────────────────────────────

interface ExpiryCache {
  expiries: Record<string, string[]> // underlying → sorted expiry dates
  fetchedAt: number
}

// ─── In-Memory Cache ──────────────────────────────────────────────────────

let expiryCache: ExpiryCache | null = null

// ─── Underlying → Instrument Key Mapping ────────────────────────────────────

const UNDERLYING_INSTRUMENT_KEYS: Record<string, string> = {
  NIFTY: NSE_INDEX_INSTRUMENT_MAP.NIFTY || 'NSE_INDEX|Nifty 50',
  BANKNIFTY: NSE_INDEX_INSTRUMENT_MAP.BANKNIFTY || 'NSE_INDEX|Nifty Bank',
  FINNIFTY: NSE_INDEX_INSTRUMENT_MAP.FINNIFTY || 'NSE_INDEX|Nifty Financial Services',
  MIDCPNIFTY: NSE_INDEX_INSTRUMENT_MAP.MIDCPNIFTY || 'NSE_INDEX|Nifty Midcap 150',
  SENSEX: NSE_INDEX_INSTRUMENT_MAP.SENSEX || 'BSE_INDEX|SENSEX',
}

/**
 * Resolves a user-provided underlying string to the canonical key.
 */
function resolveUnderlying(underlying: string): string {
  const upper = underlying.toUpperCase()
  const aliases: Record<string, string> = {
    NIFTY50: 'NIFTY',
    'NIFTY 50': 'NIFTY',
    BANKNIFTY: 'BANKNIFTY',
    'BANK NIFTY': 'BANKNIFTY',
    FINNIFTY: 'FINNIFTY',
    'FIN NIFTY': 'FINNIFTY',
    'NIFTY FIN SERVICE': 'FINNIFTY',
    'NIFTY FINANCIAL SERVICES': 'FINNIFTY',
    MIDCPNIFTY: 'MIDCPNIFTY',
    'MIDCAP NIFTY': 'MIDCPNIFTY',
    'NIFTY MIDCAP 150': 'MIDCPNIFTY',
    SENSEX: 'SENSEX',
  }
  return aliases[upper] || upper
}

// ─── Generate Candidate Expiry Dates ────────────────────────────────────────

/**
 * Generates candidate expiry dates to probe the Upstox API with.
 * Includes all Thursdays and last Thursdays of months for the next 6 months.
 */
function generateCandidateDates(): string[] {
  const now = new Date()
  const candidates = new Set<string>()

  // Generate all Thursdays for next 6 weeks (for weekly options)
  for (let i = 0; i < 45; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    if (date.getDay() === 4) { // Thursday
      candidates.add(date.toISOString().split('T')[0])
    }
  }

  // Generate last Thursday of each month for next 6 months (for monthly options)
  for (let m = 0; m < 6; m++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + m + 1, 0)
    while (monthDate.getDay() !== 4) {
      monthDate.setDate(monthDate.getDate() - 1)
    }
    candidates.add(monthDate.toISOString().split('T')[0])
  }

  // Also try the last day of each month (some indices like SENSEX expire on last day)
  for (let m = 0; m < 6; m++) {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + m + 1, 0)
    candidates.add(lastDay.toISOString().split('T')[0])
  }

  return Array.from(candidates).filter(d => d >= now.toISOString().split('T')[0]).sort()
}

// ─── Probe Upstox API for Valid Expiries ──────────────────────────────────

/**
 * Probes the Upstox Option Chain API with candidate dates to find valid expiries.
 * Uses batch probing for efficiency.
 */
async function probeExpiries(underlying: string, instrumentKey: string): Promise<string[]> {
  const token = process.env.UPSTOX_ACCESS_TOKEN
  if (!token) return []

  const candidates = generateCandidateDates()
  const validExpiries: string[] = []

  // Probe ALL candidates in parallel (Upstox API handles this well)
  const results = await Promise.allSettled(
    candidates.map(async (dateStr) => {
      try {
        const url = `https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(instrumentKey)}&expiry_date=${dateStr}`
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        })

        if (res.ok) {
          const data = await res.json()
          if (data?.status === 'success' && Array.isArray(data?.data) && data.data.length > 0) {
            return dateStr
          }
        }
      } catch {
        // Timeout or error - skip
      }
      return null
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      validExpiries.push(result.value)
    }
  }

  return validExpiries.sort()
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns sorted unique expiry dates for a given underlying.
 * Dates are in "YYYY-MM-DD" format, sorted ascending.
 */
export async function getExpiryDates(underlying: string): Promise<string[]> {
  const canonical = resolveUnderlying(underlying)
  const instrumentKey = UNDERLYING_INSTRUMENT_KEYS[canonical]

  if (!instrumentKey) {
    // Unknown underlying - return empty
    return []
  }

  // Check cache
  if (expiryCache && Date.now() - expiryCache.fetchedAt < CACHE_TTL_MS) {
    const cached = expiryCache.expiries[canonical]
    if (cached && cached.length > 0) {
      return cached
    }
  }

  // Probe for valid expiries
  try {
    const expiries = await probeExpiries(canonical, instrumentKey)

    if (expiries.length > 0) {
      // Update cache
      if (!expiryCache || Date.now() - expiryCache.fetchedAt >= CACHE_TTL_MS) {
        expiryCache = { expiries: {}, fetchedAt: Date.now() }
      }
      expiryCache.expiries[canonical] = expiries
      return expiries
    }
  } catch (err) {
    console.warn(`[UpstoxInstruments] Probe failed for ${canonical}:`, err)
  }

  // Return cached if available (even if stale)
  if (expiryCache?.expiries[canonical]?.length) {
    return expiryCache.expiries[canonical]
  }

  return []
}

/**
 * Forces a refresh of the expiry cache.
 */
export function invalidateInstrumentsCache(): void {
  expiryCache = null
}

/**
 * Returns the instrument key for a given underlying.
 */
export function getUnderlyingInstrumentKey(underlying: string): string | null {
  const canonical = resolveUnderlying(underlying)
  return UNDERLYING_INSTRUMENT_KEYS[canonical] || null
}
