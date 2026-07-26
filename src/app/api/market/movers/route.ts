import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { DEDUPED_STOCKS } from '@/lib/stocks-data';

/**
 * Deterministic pseudo-random change for a stock symbol.
 * Uses a stable hash so that the same symbol always gets the same base
 * change on a given day (rotates daily via Date.now() bucket).
 *
 * Range: roughly -6% .. +6%
 */
function deterministicChange(symbol: string, dayBucket: number): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (Math.imul(31, h) + symbol.charCodeAt(i)) | 0;
  // Mix in day bucket so the change shifts each day
  const mixed = Math.abs(Math.sin(h * 0.0001 + dayBucket));
  // Map [0, 1) → [-6, +6] with a slight negative skew (more losers than gainers)
  return parseFloat(((mixed - 0.45) * 12).toFixed(2));
}

function todayBucket(): number {
  // Day-level bucket so the movers list is stable for the whole day
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

interface Mover {
  symbol: string;
  name: string;
  sector: string;
  ltp: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Build the full movers list from DEDUPED_STOCKS in memory.
 * Each stock gets a deterministic-but-daily changePct so the page is
 * stable across reloads within the same day.
 */
function buildMoversFromSeed(): Mover[] {
  const bucket = todayBucket();
  return DEDUPED_STOCKS.map((s) => {
    const changePct = deterministicChange(s.symbol, bucket);
    const changeAmt = parseFloat(((s.ltp * changePct) / 100).toFixed(2));
    const ltp = parseFloat((s.ltp + changeAmt).toFixed(2));
    const open = parseFloat((s.ltp * (1 + (changePct > 0 ? -0.005 : 0.005))).toFixed(2));
    const high = parseFloat((Math.max(ltp, s.ltp) * (1 + Math.abs(changePct) / 200)).toFixed(2));
    const low = parseFloat((Math.min(ltp, s.ltp) * (1 - Math.abs(changePct) / 200)).toFixed(2));
    const close = parseFloat(s.ltp.toFixed(2));
    const volume = Math.floor(Math.abs(Math.sin(bucket + s.symbol.length)) * 4_000_000) + 50_000;
    return {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      ltp,
      change: changeAmt,
      changePct,
      open,
      high,
      low,
      close,
      volume,
    };
  });
}

/**
 * GET /api/market/movers
 * Returns: { success: true, data: { gainers: Mover[], losers: Mover[], asOf: ISOString } }
 *   - gainers: top 20 stocks sorted by changePct DESC
 *   - losers:  top 20 stocks sorted by changePct ASC
 *
 * The list is computed in memory from the 430+ stock seed universe.
 * If the DB has rows with live changePct, we prefer the DB; otherwise we
 * fall back to the in-memory seed list.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const bucket = todayBucket();
    let dbStocks: any[] = [];
    try {
      // Only fetch stocks that have a non-null changePct (live ones)
      dbStocks = await db.stock.findMany({
        where: { changePct: { not: null } },
        select: {
          symbol: true,
          name: true,
          sector: true,
          ltp: true,
          change: true,
          changePct: true,
          open: true,
          high: true,
          low: true,
          close: true,
          volume: true,
        },
      });
    } catch (dbErr) {
      console.error('Movers DB error:', dbErr);
    }

    // If DB is empty, use the in-memory seed list
    const source: Mover[] =
      dbStocks.length >= 50
        ? dbStocks.map((s: any) => ({
            symbol: s.symbol,
            name: s.name,
            sector: s.sector ?? 'Equity',
            ltp: Number(s.ltp ?? 0),
            change: Number(s.change ?? 0),
            changePct: Number(s.changePct ?? 0),
            open: Number(s.open ?? 0),
            high: Number(s.high ?? 0),
            low: Number(s.low ?? 0),
            close: Number(s.close ?? 0),
            volume: Number(s.volume ?? 0),
          }))
        : buildMoversFromSeed();

    // Sort copies for gainers and losers
    const gainers = [...source]
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 20);
    const losers = [...source]
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      data: {
        gainers,
        losers,
        asOf: new Date().toISOString(),
        totalScanned: source.length,
      },
    });
  } catch (error) {
    console.error('Fetch movers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch movers' },
      { status: 500 }
    );
  }
}
