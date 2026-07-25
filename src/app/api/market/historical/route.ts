import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  const symbol = req.nextUrl.searchParams.get('symbol') || 'RELIANCE';
  const days = parseInt(req.nextUrl.searchParams.get('days') || '30', 10);

  const basePrice = 1882.75;
  const data: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> = [];

  let price = basePrice * (1 - days * 0.001);
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = price * (Math.random() * 0.03 - 0.015);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);

    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 5000000) + 100000,
    });

    price = close;
  }

  return NextResponse.json({ success: true, data });
}
