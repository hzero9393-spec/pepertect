import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

const MOCK_PRICES: Record<string, { ltp: number; volatility: number }> = {
  RELIANCE:   { ltp: 1882.75,  volatility: 0.018 },
  TCS:        { ltp: 3945.60,  volatility: 0.014 },
  INFY:       { ltp: 1568.30,  volatility: 0.016 },
  HDFCBANK:   { ltp: 1685.20,  volatility: 0.015 },
  ICICIBANK:  { ltp: 1245.80,  volatility: 0.017 },
  SBIN:       { ltp: 828.45,   volatility: 0.020 },
  BHARTIARTL: { ltp: 1620.50,  volatility: 0.016 },
  ITC:        { ltp: 468.25,   volatility: 0.012 },
  HINDUNILVR: { ltp: 2534.10,  volatility: 0.013 },
  KOTAKBANK:  { ltp: 1789.30,  volatility: 0.015 },
  LT:         { ltp: 3542.65,  volatility: 0.017 },
  AXISBANK:   { ltp: 1168.40,  volatility: 0.018 },
  BAJFINANCE: { ltp: 7234.50,  volatility: 0.020 },
  MARUTI:     { ltp: 12450.80, volatility: 0.015 },
  TATAMOTORS: { ltp: 978.35,   volatility: 0.022 },
  WIPRO:      { ltp: 572.60,   volatility: 0.016 },
  HCLTECH:    { ltp: 1712.40,  volatility: 0.015 },
  SUNPHARMA:  { ltp: 1824.15,  volatility: 0.017 },
  TITAN:      { ltp: 3568.90,  volatility: 0.016 },
  ADANIENT:   { ltp: 2890.45,  volatility: 0.024 },
  // Indices (so dashboard index clicks don't 404)
  NIFTY:      { ltp: 24587.30, volatility: 0.010 },
  SENSEX:     { ltp: 80842.10, volatility: 0.010 },
  BANKNIFTY:  { ltp: 52134.55, volatility: 0.012 },
  NIFTYFS:    { ltp: 23156.80, volatility: 0.011 },
};

// Mulberry32 — small deterministic PRNG so each symbol gets stable history
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = (Math.imul(31, h) + symbol.charCodeAt(i)) | 0;
  }
  return h || 1;
}

interface Candle {
  t: number;     // epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

function generateCandles(
  symbol: string,
  baseLtp: number,
  volatility: number,
  timeframe: '1D' | '1W' | '1M' | '3M'
): Candle[] {
  const seed = seedFromSymbol(symbol);
  const rng = mulberry32(seed);

  let count: number;
  let stepMs: number;
  switch (timeframe) {
    case '1D':  count = 30;  stepMs = 15 * 60 * 1000;  break; // 15-min intervals, ~7.5h session
    case '1W':  count = 28;  stepMs = 30 * 60 * 1000;  break; // 30-min intervals across week
    case '1M':  count = 30;  stepMs = 24 * 60 * 60 * 1000; break; // daily, ~30 days
    case '3M':  count = 60;  stepMs = 24 * 60 * 60 * 1000; break; // daily, ~3 months
    default:    count = 30;  stepMs = 24 * 60 * 60 * 1000;
  }

  const now = Date.now();
  const startMs = now - count * stepMs;
  const candles: Candle[] = [];

  // Walk backwards from current price, generating realistic OHLC
  let prevClose = baseLtp * (1 - (rng() - 0.5) * volatility * 2);
  for (let i = 0; i < count; i++) {
    const t = startMs + i * stepMs;
    const drift = (rng() - 0.5) * 2 * volatility;
    const open = prevClose;
    const close = open * (1 + drift);
    const wickUp = Math.abs(drift) * 0.5 + rng() * volatility * 0.6;
    const wickDn = Math.abs(drift) * 0.5 + rng() * volatility * 0.6;
    const high = Math.max(open, close) * (1 + wickUp);
    const low  = Math.min(open, close) * (1 - wickDn);
    const baseVol = symbol.length * 100000 + 50000;
    const v = Math.floor(baseVol * (0.6 + rng() * 0.8));
    candles.push({
      t,
      o: parseFloat(open.toFixed(2)),
      h: parseFloat(high.toFixed(2)),
      l: parseFloat(low.toFixed(2)),
      c: parseFloat(close.toFixed(2)),
      v,
    });
    prevClose = close;
  }

  // Force the last candle's close to match the current LTP for visual continuity
  if (candles.length > 0) {
    candles[candles.length - 1].c = parseFloat(baseLtp.toFixed(2));
    candles[candles.length - 1].h = Math.max(candles[candles.length - 1].h, baseLtp);
    candles[candles.length - 1].l = Math.min(candles[candles.length - 1].l, baseLtp);
  }

  return candles;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { symbol: symRaw } = await params;
  const symbol = symRaw.toUpperCase();
  const url = new URL(req.url);
  const tf = (url.searchParams.get('tf') || '1M') as '1D' | '1W' | '1M' | '3M';

  try {
    // Try DB first
    const stock = await db.stock.findUnique({ where: { symbol } });
    const stockAny = stock as unknown as { ltp?: number | null };
    const baseLtp =
      stockAny?.ltp != null
        ? Number(stockAny.ltp)
        : MOCK_PRICES[symbol]?.ltp ?? 1000;
    const volatility = MOCK_PRICES[symbol]?.volatility ?? 0.015;

    const candles = generateCandles(symbol, baseLtp, volatility, tf);
    return NextResponse.json({ success: true, data: candles });
  } catch (error) {
    console.error('Chart fetch error:', error);
    // Fall back to mock even if DB fails
    const cfg = MOCK_PRICES[symbol] || { ltp: 1000, volatility: 0.015 };
    const candles = generateCandles(symbol, cfg.ltp, cfg.volatility, tf);
    return NextResponse.json({ success: true, data: candles });
  }
}
