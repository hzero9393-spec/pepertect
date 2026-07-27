import { NextRequest, NextResponse } from 'next/server';
import { getPlatformToken } from '@/lib/upstox';

/**
 * GET /api/market/live-quote?instrument_key=NSE_EQ|INE002A01018
 * GET /api/market/live-quote?instrument_key=NSE_EQ|INE002A01018,NSE_INDEX|Nifty 50
 *
 * Fetches LTP (Last Traded Price) from Upstox REST API.
 * Used as a fallback when WebSocket is not connected or for SSR.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const keysParam = sp.get('instrument_key') || sp.get('keys') || '';
  if (!keysParam) {
    return NextResponse.json(
      { success: false, error: 'instrument_key parameter required' },
      { status: 400 }
    );
  }

  const token = await getPlatformToken(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Upstox not connected. Visit /api/upstox/connect to authorize.' },
      { status: 401 }
    );
  }

  const keys = keysParam.split(',').map((k) => k.trim()).filter(Boolean);
  const url = `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodeURIComponent(keys.join(','))}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { success: false, error: `Upstox API error: ${res.status}`, detail: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data.data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
