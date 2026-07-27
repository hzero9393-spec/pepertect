import { NextRequest, NextResponse } from 'next/server';
import { workerLtp, workerQuotes } from '@/lib/upstox-worker-proxy';
import { getPlatformToken } from '@/lib/upstox';

/**
 * GET /api/market/live-quote?instrument_key=NSE_EQ|INE002A01018
 * GET /api/market/live-quote?instrument_key=NSE_EQ|INE002A01018,NSE_INDEX|Nifty 50
 * GET /api/market/live-quote?instrument_key=...&full=1   (returns OHLC + volume)
 *
 * Fetches LTP / full quote. Uses the Cloudflare Worker HTTP proxy as primary,
 * falls back to direct Upstox API call with env-var token if worker fails.
 *
 * IMPORTANT: Upstox returns data keyed by COLON-form (e.g. "NSE_INDEX:Nifty 50")
 * but our subscription keys use PIPE-form (e.g. "NSE_INDEX|Nifty 50").
 * We normalize the response keys to pipe-form so clients can do data[key] lookups.
 */

/**
 * Upstox returns quote data keyed by symbol (e.g. "NSE_FO:NIFTY26JUL23950CE"),
 * NOT by instrument_key. The actual instrument_key is inside each entry as
 * `instrument_token`. We re-key the response by instrument_token so clients
 * that subscribed with instrument_key (e.g. "NSE_FO|63937") can do direct
 * lookups: data["NSE_FO|63937"].
 *
 * Also handles the simpler case of index/equity quotes where the outer key
 * is already in colon-form (e.g. "NSE_INDEX:Nifty 50") — we convert to
 * pipe-form to match subscription keys.
 */
function normalizeQuoteKeys(data: Record<string, any>): Record<string, any> {
  if (!data || typeof data !== 'object') return data;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    // Prefer the instrument_token field if present (most reliable for options)
    const token = v?.instrument_token;
    if (token && typeof token === 'string') {
      out[token] = v;
    }
    // Also keep a colon→pipe converted key as a fallback (for entries
    // without instrument_token, or for clients that subscribed by symbol)
    const pipeKey = k.replace(/:/g, '|');
    if (!out[pipeKey]) out[pipeKey] = v;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const keysParam = sp.get('instrument_key') || sp.get('instrument_keys') || sp.get('keys') || '';
  // Always return full quote (OHLC + volume + OI) — clients that only need LTP
  // can ignore the extra fields. This makes the polling fallback richer.
  const full = true;
  if (!keysParam) {
    return NextResponse.json(
      { success: false, error: 'instrument_key parameter required' },
      { status: 400 }
    );
  }

  const keys = keysParam.split(',').map((k) => k.trim()).filter(Boolean);

  // --- Primary path: Cloudflare Worker proxy ---
  const result = full ? await workerQuotes(keys) : await workerLtp(keys);
  if (result.ok && result.data) {
    return NextResponse.json({
      success: true,
      data: normalizeQuoteKeys(result.data),
      source: 'worker',
    });
  }

  // --- Fallback path: direct Upstox API call with env token ---
  console.warn('[live-quote] Worker proxy failed, falling back to direct Upstox call:', result.error);
  const token = await getPlatformToken(req);
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'Worker unavailable and no Upstox token configured. Visit /api/upstox/connect to authorize.',
        workerError: result.error,
      },
      { status: 401 }
    );
  }

  const endpoint = full
    ? 'https://api.upstox.com/v2/market-quote/quotes'
    : 'https://api.upstox.com/v2/market-quote/ltp';
  const url = `${endpoint}?instrument_key=${encodeURIComponent(keys.join(','))}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, error: `Upstox API error: ${res.status}`, detail: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      data: normalizeQuoteKeys(data.data),
      source: 'direct',
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
