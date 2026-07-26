import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { hasFeature } from '@/lib/tier';
import { getPlatformToken } from '@/lib/upstox';
import {
  getUpcomingExpiries,
  findExpiry,
  type ExpiryIndex,
} from '@/lib/expiry-calendar';

// ---- Index configuration --------------------------------------------------

interface IndexConfig {
  symbol: string;
  display: string;
  exchange: 'NSE' | 'BSE';
  basePrice: number;
  step: number;
  lotSize: number;
  upstoxKey: string; // Upstox instrument key for the index
}

const INDICES: Record<string, IndexConfig> = {
  NIFTY: {
    symbol: 'NIFTY',
    display: 'NIFTY 50',
    exchange: 'NSE',
    basePrice: 24587.30,
    step: 50,
    lotSize: 50,
    upstoxKey: 'NSE_INDEX|Nifty 50',
  },
  SENSEX: {
    symbol: 'SENSEX',
    display: 'SENSEX',
    exchange: 'BSE',
    basePrice: 80842.10,
    step: 100,
    lotSize: 10,
    upstoxKey: 'BSE_INDEX|SENSEX',
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    display: 'BANK NIFTY',
    exchange: 'NSE',
    basePrice: 52134.55,
    step: 100,
    lotSize: 15,
    upstoxKey: 'NSE_INDEX|Nifty Bank',
  },
  FINNIFTY: {
    symbol: 'FINNIFTY',
    display: 'FIN NIFTY',
    exchange: 'NSE',
    basePrice: 23156.80,
    step: 50,
    lotSize: 25,
    upstoxKey: 'NSE_INDEX|Nifty Fin Service',
  },
};

function getExpiriesForIndex(symbol: string): string[] {
  const idx: ExpiryIndex = (['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY'].includes(symbol)
    ? symbol
    : 'NIFTY') as ExpiryIndex;
  return getUpcomingExpiries(idx, 4).map((e) => e.date);
}

// Deterministic pseudo-random generator (fallback when Upstox is unavailable)
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

/**
 * Try to fetch real option chain data from Upstox.
 * Returns null if Upstox is not connected or fetch fails.
 */
async function fetchUpstoxOptionChain(
  token: string,
  indexKey: string,
  expiry: string
): Promise<any | null> {
  try {
    const url = `https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(indexKey)}&expiry_date=${expiry}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.data || !Array.isArray(json.data) || json.data.length === 0) return null;
    return json.data;
  } catch {
    return null;
  }
}

/**
 * Try to fetch real spot price from Upstox.
 */
async function fetchUpstoxLtp(token: string, indexKey: string): Promise<number | null> {
  try {
    const url = `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodeURIComponent(indexKey)}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const key = Object.keys(json?.data || {})[0];
    return key ? json.data[key].last_price : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (!hasFeature(auth.tier as 'FREE' | 'PREMIUM', 'option_chain')) {
    return NextResponse.json(
      { success: false, error: 'Option chain requires Premium' },
      { status: 403 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const rawSymbol = (sp.get('symbol') || 'NIFTY').toUpperCase();
  const normalized =
    rawSymbol === 'NIFTYFS' || rawSymbol === 'FINNIFTY' ? 'FINNIFTY' : rawSymbol;
  const cfg = INDICES[normalized] ?? INDICES.NIFTY;

  const expiries = getExpiriesForIndex(normalized);
  const requestedExpiry = sp.get('expiry');
  const expiry = requestedExpiry && expiries.includes(requestedExpiry)
    ? requestedExpiry
    : expiries[0];

  // Calculate days to expiry
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiry + 'T00:00:00');
  const dte = Math.max(1, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Try to fetch real spot price from Upstox
  const token = await getPlatformToken(req);
  let spot: number;
  let realData = false;

  if (token) {
    const realSpot = await fetchUpstoxLtp(token, cfg.upstoxKey);
    if (realSpot && realSpot > 0) {
      spot = parseFloat(realSpot.toFixed(2));
      realData = true;
    } else {
      // Fallback to seeded spot
      const daySeed = hashSeed(normalized + today.toDateString());
      const dayRng = seededRandom(daySeed);
      const driftPct = (dayRng() - 0.5) * 0.012;
      spot = parseFloat((cfg.basePrice * (1 + driftPct)).toFixed(2));
    }
  } else {
    const daySeed = hashSeed(normalized + today.toDateString());
    const dayRng = seededRandom(daySeed);
    const driftPct = (dayRng() - 0.5) * 0.012;
    spot = parseFloat((cfg.basePrice * (1 + driftPct)).toFixed(2));
  }

  const atm = Math.round(spot / cfg.step) * cfg.step;

  // Try to fetch real option chain
  let upstoxChain: any[] | null = null;
  if (token) {
    upstoxChain = await fetchUpstoxOptionChain(token, cfg.upstoxKey, expiry);
  }

  // ===== Strategy: use REAL Upstox strikes when available =====
  // Upstox returns the full chain for an expiry — we filter to ATM ± 10 strikes
  // (or 21 strikes total: 10 ITM + ATM + 10 OTM). If Upstox has no data
  // (offline / market closed / wrong expiry), fall back to synthetic.
  const NUM_STRIKES_EACH_SIDE = 10;

  let strikeInputs: Array<{ strike: number; upstoxRow?: any }> = [];

  if (upstoxChain && upstoxChain.length > 0) {
    // Sort by strike price ascending
    const sorted = [...upstoxChain].sort((a, b) => a.strike_price - b.strike_price);
    // Find ATM index (closest strike to spot)
    let atmIdx = sorted.findIndex((r) => r.strike_price >= atm);
    if (atmIdx === -1) atmIdx = Math.floor(sorted.length / 2);
    const startIdx = Math.max(0, atmIdx - NUM_STRIKES_EACH_SIDE);
    const endIdx = Math.min(sorted.length, atmIdx + NUM_STRIKES_EACH_SIDE + 1);
    strikeInputs = sorted.slice(startIdx, endIdx).map((r) => ({
      strike: r.strike_price,
      upstoxRow: r,
    }));
  } else {
    // Fallback: generate 15 synthetic strikes around ATM
    for (let i = -7; i <= 7; i++) {
      strikeInputs.push({ strike: atm + i * cfg.step });
    }
  }

  // Build strikes: 15 strikes (7 ITM + ATM + 7 OTM)
  const strikes: Array<{
    strikePrice: number;
    itm: 'CE' | 'PE' | null;
    ce: OptionLeg;
    pe: OptionLeg;
  }> = [];

  for (const { strike, upstoxRow } of strikeInputs) {
    const diff = spot - strike;
    const ceIntrinsic = Math.max(0, diff);
    const peIntrinsic = Math.max(0, -diff);

    let ceLtp: number, peLtp: number;
    let ceOi: number, peOi: number;
    let ceVol: number, peVol: number;
    let ceIv: number, peIv: number;
    let ceChg: number, peChg: number;
    let ceChgPct: number, peChgPct: number;

    if (upstoxRow) {
      // Real Upstox data for this strike
      ceLtp = upstoxRow.call_options?.market_data?.last_price ?? ceIntrinsic + 5;
      peLtp = upstoxRow.put_options?.market_data?.last_price ?? peIntrinsic + 5;
      ceOi = upstoxRow.call_options?.market_data?.oi ?? 0;
      peOi = upstoxRow.put_options?.market_data?.oi ?? 0;
      ceVol = upstoxRow.call_options?.market_data?.volume ?? 0;
      peVol = upstoxRow.put_options?.market_data?.volume ?? 0;
      ceIv = upstoxRow.call_options?.option_greeks?.iv ?? 15;
      peIv = upstoxRow.put_options?.option_greeks?.iv ?? 15;
      ceChg = upstoxRow.call_options?.market_data?.net_change ?? 0;
      peChg = upstoxRow.put_options?.market_data?.net_change ?? 0;
      ceChgPct = ceLtp > 0 ? (ceChg / ceLtp) * 100 : 0;
      peChgPct = peLtp > 0 ? (peChg / peLtp) * 100 : 0;
    } else {
      // Fallback (no Upstox data) — use seeded random
      const fallback = fallbackLeg(spot, strike, cfg.step, dte, normalized, expiry, diff);
      ceLtp = fallback.ceLtp;
      peLtp = fallback.peLtp;
      ceOi = fallback.ceOi;
      peOi = fallback.peOi;
      ceVol = fallback.ceVol;
      peVol = fallback.peVol;
      ceIv = fallback.ceIv;
      peIv = fallback.peIv;
      ceChg = fallback.ceChg;
      peChg = fallback.peChg;
      ceChgPct = fallback.ceChgPct;
      peChgPct = fallback.peChgPct;
    }

    strikes.push({
      strikePrice: strike,
      itm: diff > 0 ? 'CE' : diff < 0 ? 'PE' : null,
      ce: {
        lastPrice: parseFloat(ceLtp.toFixed(2)),
        oi: Math.max(0, ceOi),
        volume: Math.max(0, ceVol),
        iv: parseFloat(ceIv.toFixed(1)),
        change: parseFloat(ceChg.toFixed(2)),
        changePct: parseFloat(ceChgPct.toFixed(2)),
        intrinsic: parseFloat(ceIntrinsic.toFixed(2)),
      },
      pe: {
        lastPrice: parseFloat(peLtp.toFixed(2)),
        oi: Math.max(0, peOi),
        volume: Math.max(0, peVol),
        iv: parseFloat(peIv.toFixed(1)),
        change: parseFloat(peChg.toFixed(2)),
        changePct: parseFloat(peChgPct.toFixed(2)),
        intrinsic: parseFloat(peIntrinsic.toFixed(2)),
      },
    });
  }

  const idx: ExpiryIndex = (['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY'].includes(normalized)
    ? normalized
    : 'NIFTY') as ExpiryIndex;
  const expiryEntry = findExpiry(idx, expiry);

  return NextResponse.json({
    success: true,
    data: {
      symbol: cfg.symbol,
      display: cfg.display,
      exchange: cfg.exchange,
      spot,
      atm,
      step: cfg.step,
      lotSize: cfg.lotSize,
      expiry,
      expiryLabel: expiryEntry?.label ?? null,
      expiryType: expiryEntry?.type ?? null,
      expiries,
      dte,
      strikes,
      realData,
      upstoxKey: cfg.upstoxKey,
    },
  });
}

function fallbackLeg(
  spot: number,
  strike: number,
  step: number,
  dte: number,
  normalized: string,
  expiry: string,
  diff: number
) {
  const ceIntrinsic = Math.max(0, diff);
  const peIntrinsic = Math.max(0, -diff);
  const distFactor = Math.max(0, 1 - Math.abs(diff) / (step * 7));
  const dteFactor = Math.sqrt(dte / 30);
  const baseExtrinsic = spot * 0.012 * distFactor * dteFactor;

  const seed = hashSeed(`${normalized}-${strike}-${expiry}`);
  const rng = seededRandom(seed);

  const ceExtrinsic = Math.max(2, baseExtrinsic * (0.85 + rng() * 0.3));
  const peExtrinsic = Math.max(2, baseExtrinsic * (0.85 + rng() * 0.3));

  const ceLtp = ceIntrinsic + ceExtrinsic;
  const peLtp = peIntrinsic + peExtrinsic;

  const ceOi = Math.floor((50000 - Math.abs(diff) * 80) * (0.6 + rng() * 0.8)) + 5000;
  const peOi = Math.floor((50000 - Math.abs(diff) * 80) * (0.6 + rng() * 0.8)) + 5000;
  const ceVol = Math.floor(ceOi * (0.05 + rng() * 0.15));
  const peVol = Math.floor(peOi * (0.05 + rng() * 0.15));

  const ceIv = 12 + Math.abs(diff / step) * 0.3 + rng() * 4;
  const peIv = 12 + Math.abs(diff / step) * 0.3 + rng() * 4;

  const ceChg = (rng() - 0.5) * ceLtp * 0.18;
  const peChg = (rng() - 0.5) * peLtp * 0.18;
  const ceChgPct = ceLtp > 0 ? (ceChg / ceLtp) * 100 : 0;
  const peChgPct = peLtp > 0 ? (peChg / peLtp) * 100 : 0;

  return {
    ceLtp, peLtp, ceOi, peOi, ceVol, peVol,
    ceIv, peIv, ceChg, peChg, ceChgPct, peChgPct,
  };
}

interface OptionLeg {
  lastPrice: number;
  oi: number;
  volume: number;
  iv: number;
  change: number;
  changePct: number;
  intrinsic: number;
}
