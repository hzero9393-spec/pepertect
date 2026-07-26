import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

// Fallback mock data when DB is empty (used until seeded)
const MOCK_STOCKS = [
  { symbol: 'RELIANCE',   name: 'Reliance Industries Ltd',    ltp: 1882.75,  sector: 'Energy',        lotSize: 250 },
  { symbol: 'TCS',        name: 'Tata Consultancy Services',  ltp: 3945.60,  sector: 'IT',            lotSize: 150 },
  { symbol: 'INFY',       name: 'Infosys Ltd',                ltp: 1568.30,  sector: 'IT',            lotSize: 300 },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank Ltd',              ltp: 1685.20,  sector: 'Banking',       lotSize: 550 },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank Ltd',             ltp: 1245.80,  sector: 'Banking',       lotSize: 700 },
  { symbol: 'SBIN',       name: 'State Bank of India',        ltp: 828.45,   sector: 'Banking',       lotSize: 1500 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd',          ltp: 1620.50,  sector: 'Telecom',       lotSize: 475 },
  { symbol: 'ITC',        name: 'ITC Ltd',                    ltp: 468.25,   sector: 'FMCG',          lotSize: 1600 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd',     ltp: 2534.10,  sector: 'FMCG',          lotSize: 300 },
  { symbol: 'KOTAKBANK',  name: 'Kotak Mahindra Bank Ltd',    ltp: 1789.30,  sector: 'Banking',       lotSize: 400 },
  { symbol: 'LT',         name: 'Larsen & Toubro Ltd',        ltp: 3542.65,  sector: 'Infrastructure', lotSize: 150 },
  { symbol: 'AXISBANK',   name: 'Axis Bank Ltd',              ltp: 1168.40,  sector: 'Banking',       lotSize: 1200 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd',          ltp: 7234.50,  sector: 'Finance',       lotSize: 125 },
  { symbol: 'MARUTI',     name: 'Maruti Suzuki India Ltd',    ltp: 12450.80, sector: 'Auto',          lotSize: 50 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd',            ltp: 978.35,   sector: 'Auto',          lotSize: 550 },
  { symbol: 'WIPRO',      name: 'Wipro Ltd',                  ltp: 572.60,   sector: 'IT',            lotSize: 1500 },
  { symbol: 'HCLTECH',    name: 'HCL Technologies Ltd',       ltp: 1712.40,  sector: 'IT',            lotSize: 350 },
  { symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical Industries', ltp: 1824.15, sector: 'Pharma',       lotSize: 700 },
  { symbol: 'TITAN',      name: 'Titan Company Ltd',          ltp: 3568.90,  sector: 'Consumer',      lotSize: 175 },
  { symbol: 'ADANIENT',   name: 'Adani Enterprises Ltd',      ltp: 2890.45,  sector: 'Conglomerate',  lotSize: 250 },
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
      take: 50,
      orderBy: { symbol: 'asc' },
    });

    // If DB is empty, lazily seed all mock stocks
    if (stocks.length === 0) {
      const created = await Promise.all(
        MOCK_STOCKS.map((m) =>
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
      stocks = created.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }

    const enriched = stocks.map((s) => ({
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
