import { NextResponse } from 'next/server'
import { getExpiryDates } from '@/lib/upstox-instruments'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Index symbols that should use the index API
const INDEX_SYMBOLS = new Set(['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'])

/**
 * Calculate fallback monthly expiry dates (last Thursday of each month)
 * Used when the Upstox instruments service is unavailable
 */
function calculateFallbackExpiries(): string[] {
  const now = new Date()
  const expiries: string[] = []

  for (let m = 0; m < 6; m++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + m + 1, 0)
    while (monthDate.getDay() !== 4) {
      monthDate.setDate(monthDate.getDate() - 1)
    }
    const dateStr = monthDate.toISOString().split('T')[0]
    if (monthDate.getTime() >= now.getTime() - 86400000) {
      expiries.push(dateStr)
    }
  }

  return expiries.sort()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ underlying: string }> }
) {
  try {
    const { underlying } = await params
    const underlyingUpper = underlying.toUpperCase()

    // 1. Try to get real expiry dates from Upstox instruments
    let expiries: string[] = []
    let isRealData = false
    let dataSource = 'calculated'

    try {
      const upstoxExpiries = await getExpiryDates(underlyingUpper)
      if (upstoxExpiries.length > 0) {
        expiries = upstoxExpiries
        isRealData = true
        dataSource = 'upstox'
      }
    } catch (err) {
      console.warn(`[API /options/expiries] Upstox instruments fetch failed for ${underlyingUpper}:`, err)
    }

    // 2. Fallback to calculated monthly expiries
    if (expiries.length === 0) {
      expiries = calculateFallbackExpiries()
    }

    // Find nearest expiry
    const today = new Date().toISOString().split('T')[0]
    const nearestExpiry = expiries.find(e => e >= today) || expiries[0] || ''

    return NextResponse.json({
      success: true,
      data: {
        underlying: underlyingUpper,
        expiries,
        nearestExpiry,
        isRealData,
        dataSource,
      },
    })
  } catch (error) {
    console.error('[API /options/expiries] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expiry dates' },
      { status: 500 }
    )
  }
}
