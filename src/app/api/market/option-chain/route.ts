import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { hasFeature } from '@/lib/tier';

// ---- Index configuration --------------------------------------------------
// Only 4 indices are supported on the Option Chain page (per user request):
//   NIFTY 50, SENSEX, BANK NIFTY, FIN NIFTY
// `symbol` is what the frontend sends; `step` is the strike interval.

interface IndexConfig {
  symbol: string;          // API symbol (also used in URL)
  display: string;         // Human-readable name
  exchange: 'NSE' | 'BSE';
  basePrice: number;
  step: number;
  lotSize: number;
}

const INDICES: Record<string, IndexConfig> = {
  NIFTY: {
    symbol: 'NIFTY',
    display: 'NIFTY 50',
    exchange: 'NSE',
    basePrice: 24587.30,
    step: 50,
    lotSize: 50,
  },
  SENSEX: {
    symbol: 'SENSEX',
    display: 'SENSEX',
    exchange: 'BSE',
    basePrice: 80842.10,
    step: 100,
    lotSize: 10,
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    display: 'BANK NIFTY',
    exchange: 'NSE',
    basePrice: 52134.55,
    step: 100,
    lotSize: 15,
  },
  FINNIFTY: {
    symbol: 'FINNIFTY',
    display: 'FIN NIFTY',
    exchange: 'NSE',
    basePrice: 23156.80,
    step: 50,
    lotSize: 25,
  },
};

// Generate next N weekly expiry dates (Thursdays, skip to next working day if Thursday is a holiday).
// For mock purposes, we just generate the next 4 Thursdays from "today".
function generateExpiries(count: number): string[] {
  const out: string[] = [];
  const today = new Date();
  // Find the next Thursday (day 4)
  const day = today.getDay();
  let daysUntilThursday = (4 - day + 7) % 7;
  if (daysUntilThursday === 0) {
    // Today is Thursday — include today as the 0-DTE expiry
  }
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + daysUntilThursday + i * 7);
    out.push(d.toISOString().split('T')[0]); // YYYY-MM-DD
  }
  return out;
}

// Deterministic pseudo-random generator (seeded per symbol+strike+expiry)
// so the chain looks stable across refetches within the same minute.
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
  // Allow FINNIFTY to also be requested as NIFTYFS (legacy symbol in our indices table)
  const normalized =
    rawSymbol === 'NIFTYFS' || rawSymbol === 'FINNIFTY' ? 'FINNIFTY' : rawSymbol;
  const cfg = INDICES[normalized] ?? INDICES.NIFTY;

  // Optional expiry date param. If not provided, default to nearest expiry.
  const expiries = generateExpiries(4);
  const requestedExpiry = sp.get('expiry');
  const expiry = requestedExpiry && expiries.includes(requestedExpiry)
    ? requestedExpiry
    : expiries[0];

  // Calculate days to expiry — used to scale extrinsic value.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDate = new Date(expiry + 'T00:00:00');
  const dte = Math.max(1, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Slight day-over-day drift so the spot price feels alive.
  const daySeed = hashSeed(normalized + today.toDateString());
  const dayRng = seededRandom(daySeed);
  const driftPct = (dayRng() - 0.5) * 0.012; // ±0.6%
  const spot = parseFloat((cfg.basePrice * (1 + driftPct)).toFixed(2));

  const atm = Math.round(spot / cfg.step) * cfg.step;

  // 15 strikes: 7 ITM + ATM + 7 OTM
  const strikes: Array<{
    strikePrice: number;
    itm: 'CE' | 'PE' | null;
    ce: OptionLeg;
    pe: OptionLeg;
  }> = [];

  for (let i = -7; i <= 7; i++) {
    const strike = atm + i * cfg.step;
    const diff = spot - strike; // positive when strike < spot (CE ITM, PE OTM)
    const ceIntrinsic = Math.max(0, diff);
    const peIntrinsic = Math.max(0, -diff);

    // Extrinsic decays with distance from ATM and with DTE.
    const distFactor = Math.max(0, 1 - Math.abs(diff) / (cfg.step * 7));
    const dteFactor = Math.sqrt(dte / 30); // sqrt scaling — far expiries have more premium
    const baseExtrinsic = spot * 0.012 * distFactor * dteFactor;

    const seed = hashSeed(`${normalized}-${strike}-${expiry}`);
    const rng = seededRandom(seed);

    const ceExtrinsic = Math.max(2, baseExtrinsic * (0.85 + rng() * 0.3));
    const peExtrinsic = Math.max(2, baseExtrinsic * (0.85 + rng() * 0.3));

    const ceLtp = parseFloat((ceIntrinsic + ceExtrinsic).toFixed(2));
    const peLtp = parseFloat((peIntrinsic + peExtrinsic).toFixed(2));

    const ceOi = Math.floor((50000 - Math.abs(diff) * 80) * (0.6 + rng() * 0.8)) + 5000;
    const peOi = Math.floor((50000 - Math.abs(diff) * 80) * (0.6 + rng() * 0.8)) + 5000;
    const ceVol = Math.floor(ceOi * (0.05 + rng() * 0.15));
    const peVol = Math.floor(peOi * (0.05 + rng() * 0.15));

    const ceIv = parseFloat((12 + Math.abs(diff / cfg.step) * 0.3 + rng() * 4).toFixed(1));
    const peIv = parseFloat((12 + Math.abs(diff / cfg.step) * 0.3 + rng() * 4).toFixed(1));

    const ceChg = parseFloat(((rng() - 0.5) * ceLtp * 0.18).toFixed(2));
    const peChg = parseFloat(((rng() - 0.5) * peLtp * 0.18).toFixed(2));
    const ceChgPct = ceLtp > 0 ? parseFloat(((ceChg / ceLtp) * 100).toFixed(2)) : 0;
    const peChgPct = peLtp > 0 ? parseFloat(((peChg / peLtp) * 100).toFixed(2)) : 0;

    strikes.push({
      strikePrice: strike,
      itm: diff > 0 ? 'CE' : diff < 0 ? 'PE' : null,
      ce: {
        lastPrice: ceLtp,
        oi: Math.max(0, ceOi),
        volume: Math.max(0, ceVol),
        iv: ceIv,
        change: ceChg,
        changePct: ceChgPct,
        intrinsic: parseFloat(ceIntrinsic.toFixed(2)),
      },
      pe: {
        lastPrice: peLtp,
        oi: Math.max(0, peOi),
        volume: Math.max(0, peVol),
        iv: peIv,
        change: peChg,
        changePct: peChgPct,
        intrinsic: parseFloat(peIntrinsic.toFixed(2)),
      },
    });
  }

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
      expiries,
      dte,
      strikes,
    },
  });
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
