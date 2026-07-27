/**
 * Worker proxy helper — call Upstox REST APIs via the Cloudflare Worker
 * which holds the live token in Durable Object memory.
 *
 * Why: avoids the need to share the Upstox access token with Vercel env vars.
 * The worker stores the token (pushed via /refresh-token) and proxies requests.
 *
 * Endpoints on worker:
 *   GET /ltp?instrument_key=...           → Upstox LTP
 *   GET /quotes?instrument_key=...        → Upstox full quote (multi)
 *   GET /ohlc?instrument_key=...          → Upstox OHLC
 *   GET /option-chain?instrument_key=...&expiry_date=... → Upstox option chain
 *   GET /historical?instrument_key=...&interval=...&from=...&to=... → Upstox historical
 *   GET /profile                          → Upstox user profile (token probe)
 */

import { UPSTOX_WORKER_URL } from './upstox';

export interface WorkerProxyResult {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
}

export async function workerLtp(instrumentKeys: string[]): Promise<WorkerProxyResult> {
  if (!instrumentKeys.length) return { ok: false, status: 400, error: 'no instrument_keys' };
  return callWorker('/ltp', { instrument_key: instrumentKeys.join(',') });
}

export async function workerQuotes(instrumentKeys: string[]): Promise<WorkerProxyResult> {
  if (!instrumentKeys.length) return { ok: false, status: 400, error: 'no instrument_keys' };
  return callWorker('/quotes', { instrument_key: instrumentKeys.join(',') });
}

export async function workerOhlc(instrumentKeys: string[]): Promise<WorkerProxyResult> {
  if (!instrumentKeys.length) return { ok: false, status: 400, error: 'no instrument_keys' };
  return callWorker('/ohlc', { instrument_key: instrumentKeys.join(',') });
}

export async function workerOptionChain(instrumentKey: string, expiryDate: string): Promise<WorkerProxyResult> {
  if (!instrumentKey || !expiryDate) return { ok: false, status: 400, error: 'instrument_key + expiry_date required' };
  return callWorker('/option-chain', { instrument_key: instrumentKey, expiry_date: expiryDate });
}

export async function workerHistorical(
  instrumentKey: string,
  interval: string,
  fromDate: string,
  toDate: string
): Promise<WorkerProxyResult> {
  if (!instrumentKey) return { ok: false, status: 400, error: 'instrument_key required' };
  return callWorker('/historical', {
    instrument_key: instrumentKey,
    interval,
    from: fromDate,
    to: toDate,
  });
}

export async function workerProfile(): Promise<WorkerProxyResult> {
  return callWorker('/profile', null);
}

/**
 * Core: call the worker HTTP proxy.
 */
async function callWorker(path: string, params: Record<string, string> | null): Promise<WorkerProxyResult> {
  let url = `${UPSTOX_WORKER_URL}${path}`;
  if (params) {
    const sp = new URLSearchParams(params);
    url += `?${sp.toString()}`;
  }
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json?.errors?.[0]?.message || `Worker ${path} returned ${res.status}`,
        data: json,
      };
    }
    // Upstox responses have shape: { status, data }
    // We surface both top-level status and the data payload.
    return {
      ok: json?.status === 'success',
      status: res.status,
      data: json?.data ?? json,
      error: json?.status === 'success' ? undefined : (json?.errors?.[0]?.message || 'Unknown worker error'),
    };
  } catch (e: any) {
    return { ok: false, status: 502, error: e?.message || 'Worker fetch failed' };
  }
}
