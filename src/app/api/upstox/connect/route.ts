import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizeUrl, getUserId } from '@/lib/upstox';

/**
 * GET /api/upstox/connect
 * Redirects the user to Upstox's OAuth authorize URL.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  const state = userId || 'anonymous';
  const url = buildAuthorizeUrl(state);
  return NextResponse.redirect(url);
}
