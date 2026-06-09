import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getInstrumentKey, getUpstoxExpiries } from '@/lib/upstox-api'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ underlying: string }> }
) {
  try {
    const { underlying } = await params
    const underlyingUpper = underlying.toUpperCase()

    // 1. Try Upstox API for expiry dates
    if (isUpstoxAuthenticated()) {
      try {
        const indexKey = getInstrumentKey(underlyingUpper, 'NSE_INDEX')
        const instrumentKey = indexKey || getInstrumentKey(underlyingUpper, 'NSE_EQ')

        if (instrumentKey) {
          const upstoxExpiries = await getUpstoxExpiries(instrumentKey)

          if (upstoxExpiries.length > 0) {
            // Categorize expiries (weekly < 14 days, monthly >= 14 days from now)
            const now = new Date()
            const weekly: string[] = []
            const monthly: string[] = []

            for (const exp of upstoxExpiries) {
              const expDate = new Date(exp)
              const daysDiff = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

              if (daysDiff <= 14) {
                weekly.push(exp)
              } else {
                monthly.push(exp)
              }
            }

            return NextResponse.json({
              success: true,
              data: {
                underlying: underlyingUpper,
                weekly: weekly.sort(),
                monthly: monthly.sort(),
                all: upstoxExpiries.sort(),
                isRealData: true,
                dataSource: 'upstox',
              },
            })
          }
        }
      } catch (err) {
        console.warn(`[Upstox] Expiries failed for ${underlyingUpper}:`, err)
      }
    }

    // 2. Fallback to database
    const options = await db.option.findMany({
      where: {
        underlying: underlyingUpper,
        isActive: true,
      },
      select: { expiryDate: true, expiryType: true },
      distinct: ['expiryDate', 'expiryType'],
      orderBy: { expiryDate: 'asc' },
    })

    const weekly = options
      .filter((o) => o.expiryType === 'WEEKLY')
      .map((o) => o.expiryDate.toISOString().split('T')[0])

    const monthly = options
      .filter((o) => o.expiryType === 'MONTHLY')
      .map((o) => o.expiryDate.toISOString().split('T')[0])

    // Also check futures for monthly expiries
    const futures = await db.future.findMany({
      where: {
        underlying: underlyingUpper,
        isActive: true,
      },
      select: { expiryDate: true, expiryType: true },
      distinct: ['expiryDate', 'expiryType'],
      orderBy: { expiryDate: 'asc' },
    })

    for (const f of futures) {
      const dateStr = f.expiryDate.toISOString().split('T')[0]
      if (f.expiryType === 'MONTHLY' && !monthly.includes(dateStr)) {
        monthly.push(dateStr)
      }
      if (f.expiryType === 'WEEKLY' && !weekly.includes(dateStr)) {
        weekly.push(dateStr)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        underlying: underlyingUpper,
        weekly: weekly.sort(),
        monthly: monthly.sort(),
        all: [...weekly, ...monthly]
          .filter((v, i, a) => a.indexOf(v) === i)
          .sort(),
        isRealData: false,
        dataSource: 'database',
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
