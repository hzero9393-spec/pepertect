import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { DEDUPED_STOCKS } from '@/lib/stocks-data';

// Fallback mock data when DB is empty AND seeding fails (used until seeded)
const FALLBACK_STOCKS = [
  { symbol: 'RELIANCE',   name: 'Reliance Industries Ltd',    ltp: 1882.75,  sector: 'Energy',        lotSize: 250 },
  { symbol: 'TCS',        name: 'Tata Consultancy Services',  ltp: 3945.60,  sector: 'IT',            lotSize: 150 },
  { symbol: 'INFY',       name: 'Infosys Ltd',                ltp: 1568.30,  sector: 'IT',            lotSize: 300 },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank Ltd',              ltp: 1685.20,  sector: 'Banking',       lotSize: 550 },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank Ltd',             ltp: 1245.80,  sector: 'Banking',       lotSize: 700 },
];

function generateOHLC(basePrice: number) {
  const change = basePrice * (Math.random() * 0.04 - 0.02);
  const newLtp = basePrice + change;
  const changeAmt = newLtp - basePrice;
  const changePct = (changeAmt / basePrice) * 100;
  return {
    ltp: parseFloat(newLtp.toFixed(2)),
    change: parseFloat(changeAmt.toFixed(2)),
    changePct: parseFloat(changePct.toFixed(2)),
    open: parseFloat((basePrice * (1 - 0.005 + Math.random() * 0.01)).toFixed(2)),
    high: parseFloat((newLtp * (1 + Math.random() * 0.01)).toFixed(2)),
    low: parseFloat((newLtp * (1 - Math.random() * 0.01)).toFixed(2)),
    close: parseFloat(basePrice.toFixed(2)),
    volume: Math.floor(Math.random() * 5000000) + 100000,
  };
}

/**
 * GET /api/market/stocks
 *
 * Returns the full stock universe (~430 stocks). Strategy:
 *   1. Try DB (db.stock.findMany). If DB returns ≥100 rows, return those.
 *   2. If DB fails (e.g. local SQLite where Prisma is configured for PostgreSQL,
 *      or Vercel DB not yet provisioned), fall back to the static DEDUPED_STOCKS
 *      universe with deterministic OHLC generated from each stock's base price.
 *   3. Last-ditch: return the 5 hardcoded FALLBACK_STOCKS.
 *
 * This guarantees the Market page always shows stocks, even when the DB is
 * unreachable — critical for the paper trading UX.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  // 1) Try DB
  try {
    let stocks: any[] = [];
    let dbOk = false;
    try {
      stocks = await db.stock.findMany({
        take: 1000,
        orderBy: { symbol: 'asc' },
      });
      dbOk = true;
    } catch (dbErr: any) {
      // DB not available — fall through to static universe
      console.warn('[stocks] DB lookup failed, using static universe:', dbErr?.message ?? dbErr);
    }

    if (dbOk && stocks.length >= 100) {
      // DB has full universe — enrich and return
      const enriched = stocks.map((s: any) => ({
        ...s,
        ltp: s.ltp ?? 0,
        change: s.change ?? 0,
        changePct: s.changePct ?? 0,
        open: s.open ?? 0,
        high: s.high ?? 0,
        low: s.low ?? 0,
        close: s.close ?? 0,
        volume: s.volume ?? 0,
      }));
      return NextResponse.json({
        success: true,
        data: enriched,
        meta: { source: 'db', count: enriched.length },
      });
    }

    // 2) DB unavailable OR not seeded — return the full static 430+ universe
    const staticStocks = DEDUPED_STOCKS.map((m) => ({
      symbol: m.symbol,
      name: m.name,
      sector: m.sector,
      lotSize: m.lotSize,
      tickSize: 0.05,
      ...generateOHLC(m.ltp),
    }));
    return NextResponse.json({
      success: true,
      data: staticStocks,
      meta: { source: 'static', count: staticStocks.length },
    });
  } catch (error: any) {
    console.error('Fetch stocks error:', error);
    // 3) Last-ditch fallback — return the 5 hardcoded stocks
    return NextResponse.json({
      success: true,
      data: FALLBACK_STOCKS.map((s) => ({
        symbol: s.symbol,
        name: s.name,
        sector: s.sector,
        lotSize: s.lotSize,
        ...generateOHLC(s.ltp),
      })),
      meta: { source: 'fallback', count: FALLBACK_STOCKS.length },
    });
  }
}
