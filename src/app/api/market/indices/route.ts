import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';

const MOCK_INDICES = [
  { id: 'idx-1', name: 'NIFTY 50', symbol: 'NIFTY', exchange: 'NSE', lastPrice: 24587.30, change: 294.15, changePct: 1.21, high: 24612.80, low: 24278.45, open: 24315.00, close: 24293.15 },
  { id: 'idx-2', name: 'SENSEX', symbol: 'SENSEX', exchange: 'BSE', lastPrice: 80842.10, change: 956.20, changePct: 1.20, high: 80918.50, low: 79865.30, open: 80020.00, close: 79885.90 },
  { id: 'idx-3', name: 'BANK NIFTY', symbol: 'BANKNIFTY', exchange: 'NSE', lastPrice: 52134.55, change: -128.40, changePct: -0.25, high: 52480.00, low: 51980.10, open: 52350.00, close: 52262.95 },
  { id: 'idx-4', name: 'NIFTY FIN SERVICE', symbol: 'NIFTYFS', exchange: 'NSE', lastPrice: 23156.80, change: 89.30, changePct: 0.39, high: 23210.40, low: 23045.60, open: 23090.00, close: 23067.50 },
];

export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    let indices: any[] = [];
    try {
      indices = await db.index.findMany();
    } catch (dbErr) {
      // Index table may not exist in some environments — fall back to mock
      console.error('Index DB error:', dbErr);
    }
    if (indices.length > 0) {
      const mapped = indices.map((i: any) => ({
        id: i.id,
        name: i.name,
        symbol: i.symbol,
        lastPrice: Number(i.lastPrice ?? 0),
        change: Number(i.change ?? 0),
        changePct: Number(i.changePct ?? 0),
        high: Number(i.high ?? 0),
        low: Number(i.low ?? 0),
        open: Number(i.open ?? 0),
        close: Number(i.close ?? 0),
      }));
      return NextResponse.json({ success: true, data: mapped });
    }
    return NextResponse.json({ success: true, data: MOCK_INDICES });
  } catch (error) {
    console.error('Fetch indices error:', error);
    return NextResponse.json({ success: true, data: MOCK_INDICES });
  }
}
