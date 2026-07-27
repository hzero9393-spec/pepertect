import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const tests: any[] = [];

  // Test 1: Direct fetch to worker
  try {
    const url1 = 'https://upstox-realtime.hzero9393.workers.dev/stats';
    const r1 = await fetch(url1, { signal: AbortSignal.timeout(5000) });
    tests.push({
      name: 'worker-stats-direct',
      url: url1,
      status: r1.status,
      ok: r1.ok,
      body: r1.ok ? await r1.text() : '(failed)',
    });
  } catch (e: any) {
    tests.push({
      name: 'worker-stats-direct',
      error: e?.message,
      cause: e?.cause?.code || e?.cause?.message,
    });
  }

  // Test 2: fetch to api.upstox.com
  try {
    const url2 = 'https://api.upstox.com/v2/user/profile';
    const r2 = await fetch(url2, {
      headers: { Authorization: 'Bearer test' },
      signal: AbortSignal.timeout(5000),
    });
    tests.push({
      name: 'upstox-profile-direct',
      url: url2,
      status: r2.status,
      ok: r2.ok,
    });
  } catch (e: any) {
    tests.push({
      name: 'upstox-profile-direct',
      error: e?.message,
      cause: e?.cause?.code || e?.cause?.message,
    });
  }

  // Show env vars
  const env = {
    NEXT_PUBLIC_UPSTOX_WS_URL: process.env.NEXT_PUBLIC_UPSTOX_WS_URL || '(unset)',
    UPSTOX_WORKER_URL: process.env.UPSTOX_WORKER_URL || '(unset)',
    UPSTOX_ACCESS_TOKEN_set: !!process.env.UPSTOX_ACCESS_TOKEN,
    UPSTOX_API_KEY: process.env.UPSTOX_API_KEY ? `${process.env.UPSTOX_API_KEY.slice(0,8)}...` : '(unset)',
    NODE_ENV: process.env.NODE_ENV,
  };

  return NextResponse.json({ tests, env });
}
