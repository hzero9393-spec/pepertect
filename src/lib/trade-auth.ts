import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'

export interface AuthResult {
  userId: string
  token?: string
  error?: NextResponse
}

interface CachedAuth {
  userId: string
  isActive: boolean
}

/**
 * Verifies the auth token from request headers and checks session validity.
 * Uses in-memory caching to avoid repeated DB queries.
 * Returns userId on success, or an error NextResponse on failure.
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  const token = getTokenFromHeaders(request.headers)

  if (!token) {
    return {
      userId: '',
      error: NextResponse.json(
        { error: 'No token provided. Please login.' },
        { status: 401 }
      ),
    }
  }

  // ─── Check auth cache first ──────────────────────────────────
  const cached = cache.get<CachedAuth>(CacheKeys.auth(token))
  if (cached && cached.isActive) {
    return { userId: cached.userId, token }
  }

  // ─── Verify JWT ──────────────────────────────────────────────
  const payload = verifyToken(token)
  if (!payload) {
    return {
      userId: '',
      error: NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ),
    }
  }

  // ─── Check session exists and is not expired ─────────────────
  const session = await db.session.findUnique({ where: { token } })
  if (!session || session.expiresAt < new Date()) {
    cache.delete(CacheKeys.auth(token))
    return {
      userId: '',
      error: NextResponse.json(
        { error: 'Session expired. Please login again.' },
        { status: 401 }
      ),
    }
  }

  // ─── Verify user exists and is active ────────────────────────
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isActive: true },
  })

  if (!user || !user.isActive) {
    cache.delete(CacheKeys.auth(token))
    return {
      userId: '',
      error: NextResponse.json(
        { error: 'User not found or deactivated' },
        { status: 401 }
      ),
    }
  }

  // ─── Cache the auth result ───────────────────────────────────
  cache.set(CacheKeys.auth(token), { userId: payload.userId, isActive: true }, CacheTTL.AUTH)

  return { userId: payload.userId, token }
}

/**
 * Calculate brokerage for Indian stock market paper trading.
 * Uses environment variables for configuration.
 * Default: 0.05% of total value, min ₹20, max ₹500
 */
export function calculateBrokerage(totalValue: number): number {
  const brokeragePercent = parseFloat(process.env.BROKERAGE_PERCENT || '0.0005')
  const minBrokerage = parseFloat(process.env.MIN_BROKERAGE || '20')
  const maxBrokerage = parseFloat(process.env.MAX_BROKERAGE || '500')
  const calculated = totalValue * brokeragePercent
  return Math.max(minBrokerage, Math.min(maxBrokerage, Math.round(calculated * 100) / 100))
}

/**
 * Check if the Indian stock market is currently open.
 * Returns market status info or null if check fails.
 */
export async function checkMarketStatus(): Promise<{
  isOpen: boolean
  status: 'OPEN' | 'CLOSED' | 'PRE-OPEN' | 'POST-CLOSE'
  message: string
}> {
  try {
    // Get current IST time
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60000)

    const hours = istNow.getHours()
    const minutes = istNow.getMinutes()
    const day = istNow.getDay()
    const timeInMinutes = hours * 60 + minutes

    // Weekend check
    if (day === 0 || day === 6) {
      return {
        isOpen: false,
        status: 'CLOSED',
        message: day === 0 ? 'Market closed - Sunday' : 'Market closed - Saturday',
      }
    }

    // Check for market holidays
    const todayStr = istNow.toISOString().split('T')[0]
    const holiday = await db.marketHoliday.findFirst({
      where: { date: new Date(todayStr) },
    })

    if (holiday && !holiday.isMuhurat) {
      return {
        isOpen: false,
        status: 'CLOSED',
        message: `Market closed - ${holiday.name}`,
      }
    }

    // Normal trading hours: 9:15 - 15:30 IST
    if (timeInMinutes >= 555 && timeInMinutes < 930) {
      return {
        isOpen: true,
        status: 'OPEN',
        message: 'Market is open (9:15 - 15:30 IST)',
      }
    }

    // Pre-open: 9:00 - 9:15 IST
    if (timeInMinutes >= 540 && timeInMinutes < 555) {
      return {
        isOpen: false,
        status: 'PRE-OPEN',
        message: 'Pre-open session (9:00 - 9:15 IST). Trading starts at 9:15 IST.',
      }
    }

    // After market hours
    return {
      isOpen: false,
      status: 'CLOSED',
      message: timeInMinutes < 540
        ? 'Market opens at 9:00 IST (Pre-open session)'
        : 'Market closed for the day',
    }
  } catch (error) {
    console.error('[Market Status Check] Error:', error)
    // If check fails, allow trading (fail-open for demo mode)
    return {
      isOpen: true,
      status: 'OPEN',
      message: 'Market status check unavailable - trading allowed',
    }
  }
}

/**
 * Validate order quantity against max allowed volume.
 */
export function validateOrderQuantity(quantity: number, segment: string): string | null {
  const maxVolume = parseInt(process.env.MAX_ORDER_VOLUME || '10000')

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    return 'Quantity must be a positive integer.'
  }

  if (quantity > maxVolume) {
    return `Quantity exceeds maximum allowed (${maxVolume}).`
  }

  return null // valid
}

/**
 * Get margin percentage for a segment from env config.
 */
export function getMarginPercent(segment: string): number {
  if (segment === 'FUTURES') {
    return parseFloat(process.env.DEFAULT_FUTURES_MARGIN_PERCENT || '12')
  }
  if (segment === 'OPTIONS') {
    return parseFloat(process.env.DEFAULT_OPTIONS_SHORT_MARGIN_PERCENT || '150')
  }
  return 100 // EQUITY - full amount
}
