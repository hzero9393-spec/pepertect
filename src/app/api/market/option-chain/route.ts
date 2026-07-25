import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { hasFeature } from '@/lib/tier';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  if (!hasFeature(auth.tier as 'FREE' | 'PREMIUM', 'option_chain')) {
    return NextResponse.json({ success: false, error: 'Option chain requires Premium' }, { status: 403 });
  }

  const symbol = req.nextUrl.searchParams.get('symbol') || 'NIFTY';
  const basePrice = symbol === 'NIFTY' ? 24587 : symbol === 'BANKNIFTY' ? 52134 : 1882;
  const step = symbol === 'NIFTY' ? 50 : symbol === 'BANKNIFTY' ? 100 : 10;
  const atm = Math.round(basePrice / step) * step;

  const strikes: Array<{
    strikePrice: number;
    ce: { lastPrice: number; oi: number; volume: number; iv: number; change: number; changePct: number };
    pe: { lastPrice: number; oi: number; volume: number; iv: number; change: number; changePct: number };
  }> = [];

  for (let i = -7; i <= 7; i++) {
    const sp = atm + i * step;
    const diff = basePrice - sp;
    const ceIntrinsic = Math.max(0, diff);
    const peIntrinsic = Math.max(0, -diff);
    const ceExtrinsic = Math.max(20, 150 - Math.abs(diff) * 0.05 + Math.random() * 30);
    const peExtrinsic = Math.max(20, 150 - Math.abs(diff) * 0.05 + Math.random() * 30);

    strikes.push({
      strikePrice: sp,
      ce: {
        lastPrice: parseFloat((ceIntrinsic + ceExtrinsic).toFixed(2)),
        oi: Math.floor(Math.random() * 50000) + 5000,
        volume: Math.floor(Math.random() * 10000) + 500,
        iv: parseFloat((15 + Math.random() * 10).toFixed(1)),
        change: parseFloat((Math.random() * 20 - 10).toFixed(2)),
        changePct: parseFloat((Math.random() * 8 - 4).toFixed(2)),
      },
      pe: {
        lastPrice: parseFloat((peIntrinsic + peExtrinsic).toFixed(2)),
        oi: Math.floor(Math.random() * 50000) + 5000,
        volume: Math.floor(Math.random() * 10000) + 500,
        iv: parseFloat((15 + Math.random() * 10).toFixed(1)),
        change: parseFloat((Math.random() * 20 - 10).toFixed(2)),
        changePct: parseFloat((Math.random() * 8 - 4).toFixed(2)),
      },
    });
  }

  return NextResponse.json({ success: true, data: strikes });
}
