/**
 * Resolve option-strike → Upstox instrument_key for a position.
 *
 * Problem: When an OPTIONS position is stored in the DB, we only have the
 * UNDERLYING symbol (e.g. "NIFTY"), strike price, optionType (CE/PE), and
 * expiry date. The Upstox instrument_key for that specific strike is NOT
 * stored on the Position row.
 *
 * This module fetches the option chain for (symbol + expiry) and looks up
 * the strike's CE/PE instrument_key. Results are cached in-memory per
 * (symbol+expiry) so subsequent calls are instant.
 *
 * Why: The PositionsPage needs the actual instrument_key to subscribe to
 * live ticks for the option's premium (NOT the underlying spot price).
 * Without this, a NIFTY 32900 CE position would show NIFTY spot (~24,000)
 * as its "live price" instead of the option's premium (~₹100), producing
 * absurd P&L like +₹2.4M on a ₹10,000 trade.
 */

interface OptionChainStrike {
  strikePrice: number;
  ce: { instrumentKey?: string | null; lastPrice: number };
  pe: { instrumentKey?: string | null; lastPrice: number };
}

interface CachedChain {
  strikes: OptionChainStrike[];
  fetchedAt: number;
}

// Cache lifetime: 5 minutes. Option instrument_keys for a given expiry are
// stable for the entire trading day, so we don't need to re-fetch often.
const CACHE_TTL_MS = 5 * 60 * 1000;
const chainCache = new Map<string, CachedChain>();

export interface ResolvedOptionKey {
  instrumentKey: string | null;
  source: 'cache' | 'fetch' | 'synthetic' | 'not_found';
}

/**
 * Build a deterministic synthetic option instrument key.
 *
 * This is the SAME format used by the option-chain route's `synthOptionKey()`
 * helper for fallback (non-Upstox) strikes. It is used as a last resort when:
 *   1. The option chain API fails entirely, AND
 *   2. The strike was originally a synthetic strike (not a real Upstox strike).
 *
 * Format: `NSE_FO|{SYMBOL}{YYMMDD}{STRIKE}{CE|PE}`
 *   e.g. NIFTY 32900 CE expiring 2026-07-28 → `NSE_FO|NIFTY26072832900CE`
 *
 * Note: This key will NOT resolve on Upstox's quote API — it's only useful
 * for keeping subscription state stable. The live-quote endpoint will return
 * no data for synthetic keys, and the PositionsPage will fall back to
 * avgPrice for P&L display.
 */
export function synthOptionKey(
  symbol: string,
  strike: number,
  optionType: 'CE' | 'PE',
  expiry: string
): string {
  const sym = symbol.toUpperCase();
  // expiry may be ISO date string (from DB DateTime) or 'YYYY-MM-DD'
  const dateStr = expiry.includes('T') ? expiry.slice(0, 10) : expiry;
  const yymmdd = dateStr.replace(/-/g, '').slice(2); // 2026-07-28 → 260728
  return `NSE_FO|${sym}${yymmdd}${strike}${optionType}`;
}

/**
 * Fetch the option chain for (symbol + expiry) and cache the strikes.
 * Returns the cached strikes if available and fresh.
 */
async function fetchOptionChain(
  symbol: string,
  expiry: string
): Promise<OptionChainStrike[] | null> {
  const cacheKey = `${symbol}|${expiry}`;
  const cached = chainCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.strikes;
  }

  try {
    // expiry may come from DB as ISO string (e.g. "2026-07-28T00:00:00.000Z")
    // — option-chain API expects 'YYYY-MM-DD'
    const expiryDate = expiry.includes('T') ? expiry.slice(0, 10) : expiry;
    const url = `/api/market/option-chain?symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiryDate)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success || !json?.data?.strikes) return null;

    const strikes: OptionChainStrike[] = json.data.strikes.map((s: any) => ({
      strikePrice: Number(s.strikePrice),
      ce: {
        instrumentKey: s.ce?.instrumentKey ?? null,
        lastPrice: Number(s.ce?.lastPrice ?? 0),
      },
      pe: {
        instrumentKey: s.pe?.instrumentKey ?? null,
        lastPrice: Number(s.pe?.lastPrice ?? 0),
      },
    }));

    chainCache.set(cacheKey, { strikes, fetchedAt: Date.now() });
    return strikes;
  } catch {
    return null;
  }
}

/**
 * Resolve the Upstox instrument_key for a single option position.
 *
 * Returns:
 *   - { instrumentKey, source: 'cache' | 'fetch' } if found in option chain
 *   - { instrumentKey: synthKey, source: 'synthetic' } if chain fetch failed
 *   - { instrumentKey: null, source: 'not_found' } if strike not in chain
 */
export async function resolveOptionInstrumentKey(
  symbol: string,
  strikePrice: number,
  optionType: 'CE' | 'PE',
  expiry: string
): Promise<ResolvedOptionKey> {
  const strikes = await fetchOptionChain(symbol, expiry);
  if (!strikes || strikes.length === 0) {
    // Chain fetch failed — return synthetic key so subscription state is stable
    return {
      instrumentKey: synthOptionKey(symbol, strikePrice, optionType, expiry),
      source: 'synthetic',
    };
  }

  // Find the strike (allow small float tolerance)
  const tol = 0.01;
  const row = strikes.find(
    (s) => Math.abs(s.strikePrice - strikePrice) < tol
  );
  if (!row) {
    return {
      instrumentKey: synthOptionKey(symbol, strikePrice, optionType, expiry),
      source: 'synthetic',
    };
  }

  const legKey = optionType === 'CE' ? row.ce.instrumentKey : row.pe.instrumentKey;
  if (!legKey) {
    return {
      instrumentKey: synthOptionKey(symbol, strikePrice, optionType, expiry),
      source: 'synthetic',
    };
  }

  return {
    instrumentKey: legKey,
    source: strikes ? 'fetch' : 'cache',
  };
}

/**
 * Batch resolver: resolves instrument keys for multiple option positions in
 * parallel. Groups by (symbol, expiry) so we make at most ONE option-chain
 * API call per unique (symbol, expiry) pair.
 *
 * Returns a Map keyed by `positionId` → instrumentKey (string or null).
 */
export async function resolveOptionInstrumentKeys(
  positions: Array<{
    id: string;
    symbol: string;
    strikePrice: number;
    optionType: 'CE' | 'PE';
    expiry: string;
  }>
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();

  // Group by (symbol|expiry) to dedupe option-chain fetches
  const groups = new Map<string, typeof positions>();
  for (const p of positions) {
    const key = `${p.symbol}|${p.expiry}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  // Fetch each unique (symbol, expiry) chain in parallel
  const chainPromises = Array.from(groups.entries()).map(async ([key, items]) => {
    const [symbol, expiry] = key.split('|');
    const strikes = await fetchOptionChain(symbol, expiry);
    return { key, items, strikes };
  });
  const chains = await Promise.all(chainPromises);

  // Resolve each position from its group's chain
  for (const { items, strikes } of chains) {
    for (const p of items) {
      if (!strikes || strikes.length === 0) {
        result.set(p.id, synthOptionKey(p.symbol, p.strikePrice, p.optionType, p.expiry));
        continue;
      }
      const tol = 0.01;
      const row = strikes.find((s) => Math.abs(s.strikePrice - p.strikePrice) < tol);
      if (!row) {
        result.set(p.id, synthOptionKey(p.symbol, p.strikePrice, p.optionType, p.expiry));
        continue;
      }
      const legKey = p.optionType === 'CE' ? row.ce.instrumentKey : row.pe.instrumentKey;
      result.set(p.id, legKey ?? synthOptionKey(p.symbol, p.strikePrice, p.optionType, p.expiry));
    }
  }

  return result;
}

/**
 * Clear the in-memory cache. Useful when the user changes expiries or
 * the option chain has been updated (rare).
 */
export function clearOptionChainCache(): void {
  chainCache.clear();
}
