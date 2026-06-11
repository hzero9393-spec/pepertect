import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'

export interface AdminAuthResult {
  admin: {
    id: string
    username: string
    name: string
    email: string
    role: string
    isActive: boolean
  } | null
  error?: NextResponse
}

/**
 * Authenticates an admin request by verifying the JWT token
 * and checking the Admin table (not User table).
 * Returns the admin record on success, or an error NextResponse on failure.
 */
export async function authenticateAdmin(request: NextRequest): Promise<AdminAuthResult> {
  const token = getTokenFromHeaders(request.headers)

  if (!token) {
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'No token provided. Please login.' },
        { status: 401 }
      ),
    }
  }

  // Verify JWT
  const payload = verifyToken(token)
  if (!payload) {
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ),
    }
  }

  // Check admin exists and is active
  const admin = await db.admin.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  })

  if (!admin || !admin.isActive) {
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Admin not found or deactivated' },
        { status: 401 }
      ),
    }
  }

  // Verify the role in token matches the admin's actual role
  if (payload.role !== admin.role) {
    return {
      admin: null,
      error: NextResponse.json(
        { error: 'Token role mismatch. Please login again.' },
        { status: 401 }
      ),
    }
  }

  return { admin }
}

/**
 * Helper to extract client IP address from request.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return 'unknown'
}
