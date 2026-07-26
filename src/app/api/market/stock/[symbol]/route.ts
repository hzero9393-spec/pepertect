import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { DEDUPED_STOCKS } from '@/lib/stocks-data';

// Quick lookup map for the in-memory universe — used as a fallback when the
// stock isn't yet seeded into the DB. This guarantees that EVERY stock in the
// 430+ universe can be opened on the detail page without depending on a
// lazy-seed having been triggered first.
const STOCK_UNIVERSE_MAP: Record<
  string,
  { name: string; ltp: number; sector: string; lotSize: number; exchange?: string }
> = (() => {
  const out: Record<string, { name: string; ltp: number; sector: string; lotSize: number; exchange?: string }> = {};
  for (const s of DEDUPED_STOCKS) {
    out[s.symbol.toUpperCase()] = {
      name: s.name,
      ltp: s.ltp,
      sector: s.sector,
      lotSize: s.lotSize,
      exchange: 'NSE',
    };
  }
  // Indices — these have no DEDUPED_STOCKS entry, so add them explicitly so
  // /stock/NIFTY etc. still work.
  const INDICES: Record<string, { name: string; ltp: number; sector: string; lotSize: number; exchange?: string }> = {
    NIFTY:     { name: 'NIFTY 50 Index',                     ltp: 24587.30, sector: 'Index', lotSize: 50,  exchange: 'NSE' },
    SENSEX:    { name: 'BSE SENSEX Index',                   ltp: 80842.10, sector: 'Index', lotSize: 10,  exchange: 'BSE' },
    BANKNIFTY: { name: 'NIFTY Bank Index',                   ltp: 52134.55, sector: 'Index', lotSize: 15,  exchange: 'NSE' },
    NIFTYFS:   { name: 'NIFTY Financial Services Index',     ltp: 23156.80, sector: 'Index', lotSize: 25,  exchange: 'NSE' },
    FINNIFTY:  { name: 'NIFTY Financial Services Index',     ltp: 23156.80, sector: 'Index', lotSize: 25,  exchange: 'NSE' },
  };
  for (const [k, v] of Object.entries(INDICES)) {
    if (!out[k]) out[k] = v;
  }
  return out;
})();

function generateMockOHLC(ltp: number) {
  const change = ltp * (Math.random() * 0.04 - 0.02);
  const newLtp = ltp + change;
  const changeAmt = newLtp - ltp;
  const changePct = (changeAmt / ltp) * 100;
  return {
    ltp: parseFloat(newLtp.toFixed(2)),
    change: parseFloat(changeAmt.toFixed(2)),
    changePct: parseFloat(changePct.toFixed(2)),
    open: parseFloat((ltp * (1 - 0.005 + Math.random() * 0.01)).toFixed(2)),
    high: parseFloat((newLtp * (1 + Math.random() * 0.01)).toFixed(2)),
    low: parseFloat((newLtp * (1 - Math.random() * 0.01)).toFixed(2)),
    close: parseFloat(ltp.toFixed(2)),
    volume: Math.floor(Math.random() * 5000000) + 100000,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { symbol } = await params;
  const symUpper = symbol.toUpperCase();

  try {
    let stock = await db.stock.findUnique({ where: { symbol: symUpper } });

    // 1) Try the in-memory universe — works for ALL 430+ stocks and 5 indices
    //    without needing a prior lazy-seed.
    if (!stock && STOCK_UNIVERSE_MAP[symUpper]) {
      const mock = STOCK_UNIVERSE_MAP[symUpper];
      const ohlc = generateMockOHLC(mock.ltp);
      try {
        stock = await db.stock.create({
          data: {
            symbol: symUpper,
            name: mock.name,
            sector: mock.sector,
            lotSize: mock.lotSize,
            tickSize: 0.05,
            exchange: mock.exchange || 'NSE',
            ...ohlc,
          },
        });
      } catch {
        // Race condition — another request created it in parallel.
        // Re-fetch instead of failing.
        stock = await db.stock.findUnique({ where: { symbol: symUpper } });
      }
    }

    if (!stock) {
      return NextResponse.json({ success: false, error: 'Stock not found' }, { status: 404 });
    }

    const result = {
      ...stock,
      ltp: Number(stock.ltp ?? 0),
      change: Number(stock.change ?? 0),
      changePct: Number(stock.changePct ?? 0),
      open: Number(stock.open ?? 0),
      high: Number(stock.high ?? 0),
      low: Number(stock.low ?? 0),
      close: Number(stock.close ?? 0),
      volume: Number(stock.volume ?? 0),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Fetch stock error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stock' }, { status: 500 });
  }
}
