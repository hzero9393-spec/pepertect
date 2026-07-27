/**
 * Dev-only auth bypass.
 *
 * In development mode (NODE_ENV=development), allows unauthenticated access
 * to API routes so the live data pipeline can be tested locally without a
 * registered user. In production, the normal `authenticateRequest` flow applies.
 *
 * Usage:
 *   import { authenticateOrBypass } from '@/lib/dev-auth';
 *
 *   export async function GET(req: NextRequest) {
 *     const auth = await authenticateOrBypass(req);
 *     if (auth instanceof NextResponse) return auth;
 *     // auth.userId, auth.tier available
 *     ...
 *   }
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';

const DEV_AUTH = { userId: 'dev-user', tier: 'PREMIUM', role: 'USER' };

export async function authenticateOrBypass(
  req: NextRequest
): Promise<{ userId: string; tier: string; role: string } | NextResponse> {
  if (process.env.NODE_ENV === 'development') {
    return DEV_AUTH;
  }
  return authenticateRequest(req);
}
