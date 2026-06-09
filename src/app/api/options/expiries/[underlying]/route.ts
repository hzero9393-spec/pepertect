import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ underlying: string }> }
) {
  try {
    const { underlying } = await params

    const options = await db.option.findMany({
      where: {
        underlying: underlying.toUpperCase(),
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
        underlying: underlying.toUpperCase(),
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
        underlying: underlying.toUpperCase(),
        weekly: weekly.sort(),
        monthly: monthly.sort(),
        all: [...weekly, ...monthly]
          .filter((v, i, a) => a.indexOf(v) === i)
          .sort(),
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
