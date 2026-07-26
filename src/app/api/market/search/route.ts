import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { DEDUPED_STOCKS } from '@/lib/stocks-data';

// Lazy-seed the comprehensive universe on first search if DB is empty.
// This ensures the very first search after deploy returns real results
// instead of an empty list (the stocks list page may not have been hit yet).
async function ensureSeeded() {
  try {
    const count = await db.stock.count();
    if (count > 0) return;
    await Promise.all(
      DEDUPED_STOCKS.map((m) =>
        db.stock
          .create({
            data: {
              symbol: m.symbol,
              name: m.name,
              sector: m.sector,
              lotSize: m.lotSize,
              tickSize: 0.05,
              ltp: m.ltp,
              change: 0,
              changePct: 0,
              open: m.ltp,
              high: m.ltp,
              low: m.ltp,
              close: m.ltp,
              volume: 0,
            },
          })
          .catch(() => null)
      )
    );
  } catch (e) {
    // Swallow — search will still work against the in-memory DEDUPED_STOCKS list below.
    console.error('Lazy seed in search failed:', e);
  }
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!q) {
    return NextResponse.json({ success: true, data: [] });
  }

  await ensureSeeded();

  try {
    const stocks = await db.stock.findMany({
      where: {
        OR: [
          { symbol: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { symbol: 'asc' },
    });

    // If DB query returned nothing (rare race condition), fall back to in-memory search
    let results: any[] = stocks;
    if (results.length === 0) {
      const ql = q.toLowerCase();
      results = DEDUPED_STOCKS.filter(
        (s) =>
          s.symbol.toLowerCase().includes(ql) ||
          s.name.toLowerCase().includes(ql)
      )
        .slice(0, 20)
        .map((s) => ({
          symbol: s.symbol,
          name: s.name,
          sector: s.sector,
          lotSize: s.lotSize,
          ltp: s.ltp,
          change: 0,
          changePct: 0,
          exchange: 'NSE',
          segment: 'EQUITY',
        }));
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Search error:', error);
    // Final fallback: in-memory search
    const ql = q.toLowerCase();
    const results = DEDUPED_STOCKS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(ql) ||
        s.name.toLowerCase().includes(ql)
    )
      .slice(0, 20)
      .map((s) => ({
        symbol: s.symbol,
        name: s.name,
        sector: s.sector,
        lotSize: s.lotSize,
        ltp: s.ltp,
        change: 0,
        changePct: 0,
        exchange: 'NSE',
        segment: 'EQUITY',
      }));
    return NextResponse.json({ success: true, data: results });
  }
}
