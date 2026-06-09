import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getInstrumentKey, getUpstoxOptionChain } from '@/lib/upstox-api'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ underlying: string }> }
) {
  try {
    const { underlying } = await params
    const underlyingUpper = underlying.toUpperCase()
    const { searchParams } = new URL(request.url)
    const expiry = searchParams.get('expiry')

    // 1. Try Upstox API for option chain
    if (isUpstoxAuthenticated()) {
      try {
        const indexKey = getInstrumentKey(underlyingUpper, 'NSE_INDEX')
        const instrumentKey = indexKey || getInstrumentKey(underlyingUpper, 'NSE_EQ')

        if (instrumentKey) {
          const upstoxChain = await getUpstoxOptionChain(instrumentKey, expiry || undefined)

          if (upstoxChain?.option_chain && upstoxChain.option_chain.length > 0) {
            // Transform Upstox format to our format
            const chain = upstoxChain.option_chain.map(item => {
              const ceData = item.ce ? {
                ltp: item.ce.ltp,
                change: item.ce.change,
                changePercent: item.ce.change_percent,
                volume: item.ce.volume,
                openInterest: item.ce.oi,
                oiChange: 0,
                impliedVolatility: item.ce.iv,
                delta: item.ce.delta,
                gamma: item.ce.gamma,
                theta: item.ce.theta,
                vega: item.ce.vega,
              } : null

              const peData = item.pe ? {
                ltp: item.pe.ltp,
                change: item.pe.change,
                changePercent: item.pe.change_percent,
                volume: item.pe.volume,
                openInterest: item.pe.oi,
                oiChange: 0,
                impliedVolatility: item.pe.iv,
                delta: item.pe.delta,
                gamma: item.pe.gamma,
                theta: item.pe.theta,
                vega: item.pe.vega,
              } : null

              return {
                strikePrice: item.strike_price,
                expiryDate: item.expiry,
                ce: ceData,
                pe: peData,
              }
            })

            // Calculate PCR and Max Pain
            const totalCEOI = chain.reduce((sum, item) => sum + (item.ce?.openInterest || 0), 0)
            const totalPEOI = chain.reduce((sum, item) => sum + (item.pe?.openInterest || 0), 0)
            const pcr = totalCEOI > 0 ? totalPEOI / totalCEOI : 0

            const strikes = chain.map(item => item.strikePrice)
            let maxPain = strikes[0] || 0
            let minLoss = Infinity

            for (const strike of strikes) {
              let totalLoss = 0
              for (const item of chain) {
                if (item.ce) {
                  totalLoss += Math.max(strike - item.strikePrice, 0) * (item.ce.openInterest || 0)
                }
                if (item.pe) {
                  totalLoss += Math.max(item.strikePrice - strike, 0) * (item.pe.openInterest || 0)
                }
              }
              if (totalLoss < minLoss) {
                minLoss = totalLoss
                maxPain = strike
              }
            }

            return NextResponse.json({
              success: true,
              data: {
                chain,
                spot: upstoxChain.underlying_spot_price,
                pcr: Math.round(pcr * 100) / 100,
                maxPain,
                isRealData: true,
                dataSource: 'upstox',
              },
            })
          }
        }
      } catch (err) {
        console.warn(`[Upstox] Option chain failed for ${underlyingUpper}:`, err)
      }
    }

    // 2. Fallback to database
    const where: Record<string, unknown> = {
      underlying: underlyingUpper,
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
        data: { chain: [], spot: 0, pcr: 0, maxPain: 0, isRealData: false, dataSource: 'database' },
      })
    }

    // Spot price from the option data
    const spot = options[0].underlyingPrice

    // Calculate PCR
    const totalCEOI = options
      .filter((o) => o.optionType === 'CE')
      .reduce((sum, o) => sum + o.openInterest, 0)
    const totalPEOI = options
      .filter((o) => o.optionType === 'PE')
      .reduce((sum, o) => sum + o.openInterest, 0)
    const pcr = totalCEOI > 0 ? totalPEOI / totalCEOI : 0

    // Calculate Max Pain
    const strikes = [...new Set(options.map((o) => o.strikePrice))].sort((a, b) => a - b)
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
        isRealData: false,
        dataSource: 'database',
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
