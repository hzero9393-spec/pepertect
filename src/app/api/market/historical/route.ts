import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getPlatformToken } from '@/lib/upstox';
import { getUpstoxKey } from '@/lib/upstox-instruments';

/**
 * GET /api/market/historical?symbol=RELIANCE&days=30&interval=1d
 *
 * Returns daily OHLC candles — the source for stop-loss / support-resistance
 * levels shown in the Stock Detail page and on the trade ticket.
 *
 * Strategy:
 *   1. If user has an Upstox token, fetch REAL daily candles from Upstox
 *      /v2/historical-candle/{instrument_key}/{interval}/{to_date}
 *   2. Fall back to synthetic candles when token missing/expired or fetch fails.
 *
 * Upstox interval values: '1minute' | '30minute' | 'day' | 'week' | 'month'
 * Our API accepts the friendly form: '1d' | '1h' | '30m' | '1m' | '1w' | '1M'
 * and translates to the Upstox form.
 */

const INTERVAL_MAP: Record<string, string> = {
  '1d':  'day',
  '1D':  'day',
  'day': 'day',
  '1h':  '30minute',  // Upstox has no 1h, use 30m × 2
  '30m': '30minute',
  '15m': '15minute',  // Not in v2 historical but supported in v3 feed
  '5m':  '5minute',   // Same as above
  '1m':  '1minute',
  '1w':  'week',
  '1M':  'month',
};

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

async function fetchUpstoxHistorical(
  token: string,
  instrumentKey: string,
  interval: string,
  days: number
): Promise<Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> | null> {
  try {
    const today = new Date();
    const toDate = today.toISOString().split('T')[0];
    const url = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(instrumentKey)}/${interval}/${toDate}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; PepertectPaperTrading/1.0)',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const candles = json?.data?.candles;
    if (!Array.isArray(candles) || candles.length === 0) return null;
    // candles format: [timestamp, open, high, low, close, volume, ?]
    // sort oldest → newest
    const sorted = [...candles].sort((a, b) => (a[0] < b[0] ? -1 : 1));
    // take last `days` candles
    const sliced = sorted.slice(-days);
    return sliced.map((c) => ({
      date: typeof c[0] === 'string' ? c[0].split('T')[0] : String(c[0]),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low:  parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: typeof c[5] === 'number' ? c[5] : parseInt(c[5] || '0', 10) || 0,
    }));
  } catch {
    return null;
  }
}

function synthetic(
  symbol: string,
  days: number,
  basePrice: number
): Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> {
  const today = new Date();
  const seed = hashSeed(symbol + today.toDateString());
  const rng = seededRandom(seed);
  const data: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> = [];
  let price = basePrice * (1 - days * 0.001);
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = price * (rng() * 0.03 - 0.015);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + rng() * 0.005);
    const low = Math.min(open, close) * (1 - rng() * 0.005);

    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(rng() * 5000000) + 100000,
    });
    price = close;
  }
  return data;
}

const BASE_PRICES: Record<string, number> = {
  RELIANCE: 1882.75, TCS: 3145.20, INFY: 1185.40, HDFCBANK: 1295.60,
  SBIN: 625.30, ICICIBANK: 1342.10, TATAMOTORS: 712.40, WIPRO: 285.60,
  AXISBANK: 1148.50, ITC: 478.20, NIFTY: 24587.30, BANKNIFTY: 52134.55,
  SENSEX: 80842.10, FINNIFTY: 23156.80,
};

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const symbol = (sp.get('symbol') || 'RELIANCE').toUpperCase();
  const days = Math.min(365, Math.max(1, parseInt(sp.get('days') || '30', 10)));
  const intervalRaw = sp.get('interval') || '1d';
  const upstoxInterval = INTERVAL_MAP[intervalRaw] || 'day';

  // 1) Try Upstox real data if token + instrument key available
  const token = await getPlatformToken(req);
  const instrumentKey = getUpstoxKey(symbol);

  let candles: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> | null = null;
  let realData = false;

  if (token && instrumentKey) {
    candles = await fetchUpstoxHistorical(token, instrumentKey, upstoxInterval, days);
    if (candles && candles.length > 0) realData = true;
  }

  // 2) Fallback to synthetic
  if (!candles || candles.length === 0) {
    const base = BASE_PRICES[symbol] ?? 1000;
    candles = synthetic(symbol, days, base);
  }

  return NextResponse.json({
    success: true,
    data: candles,
    meta: {
      symbol,
      days,
      interval: intervalRaw,
      upstoxInterval,
      instrumentKey,
      realData,
      source: realData ? 'upstox' : 'synthetic',
    },
  });
}
