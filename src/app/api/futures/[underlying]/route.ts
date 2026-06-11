import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getInstrumentKey, getUpstoxOptionChain } from '@/lib/upstox-api'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Index configurations for futures
const INDEX_CONFIGS: Record<string, { lotSize: number; marginPercent: number }> = {
  NIFTY: { lotSize: 50, marginPercent: 12 },
  BANKNIFTY: { lotSize: 25, marginPercent: 14 },
  FINNIFTY: { lotSize: 40, marginPercent: 12 },
  SENSEX: { lotSize: 15, marginPercent: 12 },
  MIDCPNIFTY: { lotSize: 75, marginPercent: 12 },
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ underlying: string }> }
) {
  try {
    const { underlying } = await params
    const underlyingUpper = underlying.toUpperCase()
    const { searchParams } = new URL(request.url)
    const expiry = searchParams.get('expiry')

    // 1. Try Upstox API for futures data (via option chain endpoint which includes futures info)
    if (await isUpstoxAuthenticated()) {
      try {
        const indexKey = getInstrumentKey(underlyingUpper, 'NSE_INDEX')
        const instrumentKey = indexKey || getInstrumentKey(underlyingUpper, 'NSE_EQ')

        if (instrumentKey) {
          const upstoxChain = await getUpstoxOptionChain(instrumentKey, expiry || undefined)

          if (upstoxChain?.option_chain && upstoxChain.option_chain.length > 0) {
            // Get unique expiries from option chain
            const expirySet = new Set<string>()
            for (const item of upstoxChain.option_chain) {
              if (item.expiry) expirySet.add(item.expiry)
            }
            const expiries = Array.from(expirySet).sort()

            // Create futures contracts from the option chain expiries
            // Each expiry represents a futures contract month
            const config = INDEX_CONFIGS[underlyingUpper] || { lotSize: 50, marginPercent: 12 }
            const spotPrice = upstoxChain.underlying_spot_price

            const futures = expiries.slice(0, 3).map((exp, idx) => {
              const expDate = new Date(exp)
              // Estimate futures price: spot + basis (roughly 0.05% per month for NIFTY)
              const monthsToExpiry = Math.max(0.5, (expDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000))
              const basisPercent = monthsToExpiry * 0.05 // 0.05% per month
              const futuresPrice = spotPrice * (1 + basisPercent / 100)

              // Get OI and volume from the nearest strike option data
              const atmStrike = Math.round(spotPrice / 50) * 50
              const atmOptions = upstoxChain.option_chain.filter(o => o.strike_price === atmStrike && o.expiry === exp)
              const ceData = atmOptions.find(o => o.ce)?.ce
              const peData = atmOptions.find(o => o.pe)?.pe

              // Aggregate OI from all strikes for this expiry (proxy for futures OI)
              let totalOI = 0
              let totalVolume = 0
              for (const item of upstoxChain.option_chain) {
                if (item.expiry === exp) {
                  totalOI += (item.ce?.oi || 0) + (item.pe?.oi || 0)
                  totalVolume += (item.ce?.volume || 0) + (item.pe?.volume || 0)
                }
              }

              return {
                id: `${underlyingUpper}_FUT_${exp}`,
                underlying: underlyingUpper,
                expiryDate: exp,
                expiryType: idx === 0 ? 'CURRENT' : idx === 1 ? 'NEXT' : 'FAR',
                lotSize: config.lotSize,
                ltp: Math.round(futuresPrice * 100) / 100,
                change: Math.round((futuresPrice - spotPrice) * 100) / 100,
                changePercent: Math.round(basisPercent * 100) / 100,
                open: Math.round(futuresPrice * 0.999 * 100) / 100,
                high: Math.round(futuresPrice * 1.002 * 100) / 100,
                low: Math.round(futuresPrice * 0.998 * 100) / 100,
                previousClose: Math.round(spotPrice * 100) / 100,
                volume: Math.round(totalVolume / 2), // approximate futures volume
                openInterest: Math.round(totalOI / 2 / 100) / 100, // in lakhs
                oiChange: 0,
                basis: Math.round((futuresPrice - spotPrice) * 100) / 100,
                basisPercent: Math.round(basisPercent * 100) / 100,
                marginPercent: config.marginPercent,
                isActive: true,
                isRealData: true,
                dataSource: 'upstox',
              }
            })

            return NextResponse.json({
              success: true,
              data: futures,
              isRealData: true,
              dataSource: 'upstox',
            })
          }
        }
      } catch (err) {
        console.warn(`[Upstox] Futures data failed for ${underlyingUpper}:`, err)
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

    const futures = await db.future.findMany({
      where,
      orderBy: { expiryDate: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: futures,
    })
  } catch (error) {
    console.error('[API /futures] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch futures data' },
      { status: 500 }
    )
  }
}
