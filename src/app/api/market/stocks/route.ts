import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
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

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    let stocks = await db.stock.findMany({
      take: 1000,
      orderBy: { symbol: 'asc' },
    });

    // If DB is empty OR has fewer than 100 stocks, lazily seed the comprehensive
    // 430+ stock universe. This handles both fresh DBs and partially-seeded ones
    // (e.g. from older deployments that only had ~25 stocks).
    if (stocks.length < 100) {
      try {
        // Find which symbols are already in the DB so we only insert missing ones
        const existingSymbols = new Set(stocks.map((s: any) => s.symbol));
        const toSeed = DEDUPED_STOCKS.filter((m) => !existingSymbols.has(m.symbol));

        if (toSeed.length > 0) {
          // Use createMany in batches of 50 to stay within Vercel's 30s function
          // timeout and avoid overwhelming the DB connection pool.
          const BATCH_SIZE = 50;
          for (let i = 0; i < toSeed.length; i += BATCH_SIZE) {
            const batch = toSeed.slice(i, i + BATCH_SIZE);
            try {
              await db.stock.createMany({
                data: batch.map((m) => ({
                  symbol: m.symbol,
                  name: m.name,
                  sector: m.sector,
                  lotSize: m.lotSize,
                  tickSize: 0.05,
                  ...generateOHLC(m.ltp),
                })),
                skipDuplicates: true,
              });
            } catch (batchErr) {
              console.error(`Stock seed batch ${i} error:`, batchErr);
              // Continue with next batch — partial seeding is better than none
            }
          }
        }

        // Re-fetch all stocks after seeding (existing + newly created) so we
        // return a complete sorted list to the caller.
        stocks = await db.stock.findMany({
          take: 1000,
          orderBy: { symbol: 'asc' },
        });
        // If seeding failed entirely, fall back to the minimal list
        if (stocks.length === 0) {
          stocks = await Promise.all(
            FALLBACK_STOCKS.map((m) =>
              db.stock.create({
                data: {
                  symbol: m.symbol,
                  name: m.name,
                  sector: m.sector,
                  lotSize: m.lotSize,
                  tickSize: 0.05,
                  ...generateOHLC(m.ltp),
                },
              })
            )
          );
        }
      } catch (seedErr) {
        console.error('Stock seeding error:', seedErr);
        // Return the fallback list directly without persisting
        return NextResponse.json({
          success: true,
          data: FALLBACK_STOCKS.map((s) => ({
            symbol: s.symbol,
            name: s.name,
            sector: s.sector,
            lotSize: s.lotSize,
            ...generateOHLC(s.ltp),
          })),
        });
      }
    }

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

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Fetch stocks error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stocks' }, { status: 500 });
  }
}
