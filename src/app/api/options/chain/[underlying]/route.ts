import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ underlying: string }> }
) {
  try {
    const { underlying } = await params
    const { searchParams } = new URL(request.url)
    const expiry = searchParams.get('expiry')

    const where: Record<string, unknown> = {
      underlying: underlying.toUpperCase(),
      isActive: true,
    }

    if (expiry) {
      where.expiryDate = new Date(expiry)
    }

    const options = await db.option.findMany({
      where,
      orderBy: [{ strikePrice: 'asc' }, { optionType: 'asc' }],
    })

    if (options.length === 0) {
      return NextResponse.json({
        success: true,
        data: { chain: [], spot: 0, pcr: 0, maxPain: 0 },
      })
    }

    // Spot price from the option data
    const spot = options[0].underlyingPrice

    // Calculate PCR (Put-Call Ratio) = Total PE OI / Total CE OI
    const totalCEOI = options
      .filter((o) => o.optionType === 'CE')
      .reduce((sum, o) => sum + o.openInterest, 0)
    const totalPEOI = options
      .filter((o) => o.optionType === 'PE')
      .reduce((sum, o) => sum + o.openInterest, 0)
    const pcr = totalCEOI > 0 ? totalPEOI / totalCEOI : 0

    // Calculate Max Pain
    // Max Pain = strike price where total loss for option writers is minimum
    // (equivalently, total value of all in-the-money options is minimum)
    const strikes = [...new Set(options.map((o) => o.strikePrice))].sort(
      (a, b) => a - b
    )

    let maxPain = strikes[0]
    let minLoss = Infinity

    for (const strike of strikes) {
      let totalLoss = 0

      for (const option of options) {
        const intrinsic =
          option.optionType === 'CE'
            ? Math.max(strike - option.strikePrice, 0)
            : Math.max(option.strikePrice - strike, 0)
        totalLoss += intrinsic * option.openInterest
      }

      if (totalLoss < minLoss) {
        minLoss = totalLoss
        maxPain = strike
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        chain: options,
        spot,
        pcr: Math.round(pcr * 100) / 100,
        maxPain,
      },
    })
  } catch (error) {
    console.error('[API /options/chain] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch option chain' },
      { status: 500 }
    )
  }
}
