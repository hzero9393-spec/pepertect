import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

const MOCK_PRICES: Record<string, { name: string; ltp: number; sector: string; lotSize: number }> = {
  RELIANCE:     { name: 'Reliance Industries Ltd',        ltp: 1882.75, sector: 'Energy',        lotSize: 250 },
  TCS:          { name: 'Tata Consultancy Services Ltd',  ltp: 3945.60, sector: 'IT',            lotSize: 150 },
  INFY:         { name: 'Infosys Ltd',                   ltp: 1568.30, sector: 'IT',            lotSize: 300 },
  HDFCBANK:     { name: 'HDFC Bank Ltd',                 ltp: 1685.20, sector: 'Banking',       lotSize: 550 },
  ICICIBANK:    { name: 'ICICI Bank Ltd',                ltp: 1245.80, sector: 'Banking',       lotSize: 700 },
  SBIN:         { name: 'State Bank of India',          ltp: 828.45,  sector: 'Banking',       lotSize: 1500 },
  BHARTIARTL:   { name: 'Bharti Airtel Ltd',            ltp: 1620.50, sector: 'Telecom',       lotSize: 475 },
  ITC:          { name: 'ITC Ltd',                       ltp: 468.25,  sector: 'FMCG',          lotSize: 1600 },
  HINDUNILVR:   { name: 'Hindustan Unilever Ltd',       ltp: 2534.10, sector: 'FMCG',          lotSize: 300 },
  KOTAKBANK:    { name: 'Kotak Mahindra Bank Ltd',       ltp: 1789.30, sector: 'Banking',       lotSize: 400 },
  LT:           { name: 'Larsen & Toubro Ltd',           ltp: 3542.65, sector: 'Infrastructure', lotSize: 150 },
  AXISBANK:     { name: 'Axis Bank Ltd',                ltp: 1168.40, sector: 'Banking',       lotSize: 1200 },
  BAJFINANCE:   { name: 'Bajaj Finance Ltd',            ltp: 7234.50, sector: 'Finance',       lotSize: 125 },
  MARUTI:       { name: 'Maruti Suzuki India Ltd',       ltp: 12450.80, sector: 'Auto',        lotSize: 50 },
  TATAMOTORS:   { name: 'Tata Motors Ltd',               ltp: 978.35,  sector: 'Auto',          lotSize: 550 },
  WIPRO:        { name: 'Wipro Ltd',                     ltp: 572.60,  sector: 'IT',            lotSize: 1500 },
  HCLTECH:      { name: 'HCL Technologies Ltd',         ltp: 1712.40, sector: 'IT',            lotSize: 350 },
  SUNPHARMA:    { name: 'Sun Pharmaceutical Industries', ltp: 1824.15, sector: 'Pharma',        lotSize: 700 },
  TITAN:        { name: 'Titan Company Ltd',             ltp: 3568.90, sector: 'Consumer',      lotSize: 175 },
  ADANIENT:     { name: 'Adani Enterprises Ltd',        ltp: 2890.45, sector: 'Conglomerate', lotSize: 250 },
};

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

  try {
    let stock = await db.stock.findUnique({ where: { symbol } });

    if (!stock && MOCK_PRICES[symbol]) {
      const mock = MOCK_PRICES[symbol];
      const ohlc = generateMockOHLC(mock.ltp);
      stock = await db.stock.create({
        data: {
          symbol,
          name: mock.name,
          sector: mock.sector,
          lotSize: mock.lotSize,
          tickSize: 0.05,
          ...ohlc,
        },
      });
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
