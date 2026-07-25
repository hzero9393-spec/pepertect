import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractBearerToken } from '@/lib/auth';

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
  userTier?: string;
  userRole?: string;
}

export async function authenticateRequest(
  req: NextRequest
): Promise<{ userId: string; tier: string; role: string } | NextResponse> {
  const token = extractBearerToken(req.headers.get('authorization'));
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  return { userId: payload.userId, tier: payload.tier, role: payload.role };
}
