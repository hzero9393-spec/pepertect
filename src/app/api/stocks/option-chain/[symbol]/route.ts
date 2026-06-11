import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isUpstoxAuthenticated, getInstrumentKey, getUpstoxOptionChain } from '@/lib/upstox-api'
import type { UpstoxOptionChainItem } from '@/lib/upstox-api'
import { isDhanConfigured, getSecurityId, getDhanOptionChain, fetchStockFnoData } from '@/lib/dhan-api'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()
    const { searchParams } = new URL(request.url)
    const expiry = searchParams.get('expiry')

    // 1. Try Upstox API for option chain
    if (await isUpstoxAuthenticated()) {
      try {
        const eqKey = getInstrumentKey(symbolUpper, 'NSE_EQ')
        if (eqKey) {
          const upstoxChain = await getUpstoxOptionChain(eqKey, expiry || undefined)

          if (upstoxChain?.option_chain && upstoxChain.option_chain.length > 0) {
            // Transform Upstox v2 format
            const chain = upstoxChain.option_chain.map((item: UpstoxOptionChainItem) => {
              const callData = item.call_options ? {
                ltp: item.call_options.market_data?.ltp || 0,
                change: item.call_options.market_data?.close_price
                  ? item.call_options.market_data.ltp - item.call_options.market_data.close_price
                  : 0,
                changePercent: item.call_options.market_data?.close_price && item.call_options.market_data.close_price > 0
                  ? ((item.call_options.market_data.ltp - item.call_options.market_data.close_price) / item.call_options.market_data.close_price) * 100
                  : 0,
                volume: item.call_options.market_data?.volume || 0,
                openInterest: item.call_options.market_data?.oi || 0,
                oiChange: (item.call_options.market_data?.oi || 0) - (item.call_options.market_data?.prev_oi || 0),
                impliedVolatility: item.call_options.option_greeks?.iv || 0,
                delta: item.call_options.option_greeks?.delta || 0,
                gamma: item.call_options.option_greeks?.gamma || 0,
                theta: item.call_options.option_greeks?.theta || 0,
                vega: item.call_options.option_greeks?.vega || 0,
              } : null

              const putData = item.put_options ? {
                ltp: item.put_options.market_data?.ltp || 0,
                change: item.put_options.market_data?.close_price
                  ? item.put_options.market_data.ltp - item.put_options.market_data.close_price
                  : 0,
                changePercent: item.put_options.market_data?.close_price && item.put_options.market_data.close_price > 0
                  ? ((item.put_options.market_data.ltp - item.put_options.market_data.close_price) / item.put_options.market_data.close_price) * 100
                  : 0,
                volume: item.put_options.market_data?.volume || 0,
                openInterest: item.put_options.market_data?.oi || 0,
                oiChange: (item.put_options.market_data?.oi || 0) - (item.put_options.market_data?.prev_oi || 0),
                impliedVolatility: item.put_options.option_greeks?.iv || 0,
                delta: item.put_options.option_greeks?.delta || 0,
                gamma: item.put_options.option_greeks?.gamma || 0,
                theta: item.put_options.option_greeks?.theta || 0,
                vega: item.put_options.option_greeks?.vega || 0,
              } : null

              return {
                strikePrice: item.strike_price,
                expiryDate: item.expiry,
                ce: callData,
                pe: putData,
              }
            })

            // Calculate PCR and Max Pain
            const totalCEOI = chain.reduce((sum: number, item: { ce: { openInterest: number } | null }) => sum + (item.ce?.openInterest || 0), 0)
            const totalPEOI = chain.reduce((sum: number, item: { pe: { openInterest: number } | null }) => sum + (item.pe?.openInterest || 0), 0)
            const pcr = totalCEOI > 0 ? totalPEOI / totalCEOI : 0

            const strikes = chain.map((item: { strikePrice: number }) => item.strikePrice)
            let maxPain = strikes[0] || 0
            let minLoss = Infinity

            for (const strike of strikes) {
              let totalLoss = 0
              for (const item of chain as Array<{ strikePrice: number; ce: { openInterest: number } | null; pe: { openInterest: number } | null }>) {
                if (item.ce) totalLoss += Math.max(strike - item.strikePrice, 0) * (item.ce.openInterest || 0)
                if (item.pe) totalLoss += Math.max(item.strikePrice - strike, 0) * (item.pe.openInterest || 0)
              }
              if (totalLoss < minLoss) { minLoss = totalLoss; maxPain = strike }
            }

            const expiries = [...new Set(upstoxChain.option_chain.map((o: UpstoxOptionChainItem) => o.expiry))].sort()
            const spotPrice = upstoxChain.underlying_spot_price || (chain.length > 0 ? (upstoxChain.option_chain as UpstoxOptionChainItem[])[0]?.underlying_spot_price : 0)

            return NextResponse.json({
              success: true,
              data: {
                underlying: symbolUpper,
                underlyingPrice: spotPrice,
                chain,
                pcr: Math.round(pcr * 100) / 100,
                maxPain,
                ivPercentile: 0,
                expiries,
                isRealData: true,
                dataSource: 'upstox',
              },
            })
          }
        }
      } catch (err) {
        console.warn(`[Upstox] Stock option chain failed for ${symbolUpper}:`, err)
      }
    }

    // 2. Try Dhan API
    if (isDhanConfigured()) {
      const foId = getSecurityId(symbolUpper, 'NSE_FO')
      if (foId) {
        const dhanChain = await getDhanOptionChain(foId, 'STOCK')
        if (dhanChain && dhanChain.optionChain?.length > 0) {
          let chain = dhanChain.optionChain
          if (expiry) {
            chain = chain.filter(item => item.expiryDate === expiry)
          }
          return NextResponse.json({
            success: true,
            data: {
              underlying: symbolUpper,
              underlyingPrice: dhanChain.underlyingPrice,
              chain,
              pcr: dhanChain.pcr,
              maxPain: dhanChain.maxPain,
              ivPercentile: dhanChain.ivPercentile,
              expiries: dhanChain.expiries,
              isRealData: true,
              dataSource: 'dhan',
            },
          })
        }
      }
    }

    // 3. Fallback: Get from database
    const where: Record<string, unknown> = {
      underlying: symbolUpper,
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
      // Also try fetching from FnoData which includes option chain
      const fnoData = await fetchStockFnoData(symbolUpper)
      return NextResponse.json({
        success: true,
        data: {
          underlying: symbolUpper,
          underlyingPrice: 0,
          chain: fnoData.optionChain,
          pcr: fnoData.optionChainSummary.pcr,
          maxPain: fnoData.optionChainSummary.maxPain,
          ivPercentile: fnoData.optionChainSummary.ivPercentile,
          expiries: fnoData.optionChainSummary.availableExpiries,
          isRealData: fnoData.isRealData,
          dataSource: 'database',
        },
      })
    }

    const spot = options[0].underlyingPrice

    // Calculate PCR
    const totalCEOI = options.filter(o => o.optionType === 'CE').reduce((sum, o) => sum + o.openInterest, 0)
    const totalPEOI = options.filter(o => o.optionType === 'PE').reduce((sum, o) => sum + o.openInterest, 0)
    const pcr = totalCEOI > 0 ? totalPEOI / totalCEOI : 0

    // Calculate Max Pain
    const strikes = [...new Set(options.map(o => o.strikePrice))].sort((a, b) => a - b)
    let maxPain = strikes[0]
    let minLoss = Infinity
    for (const strike of strikes) {
      let totalLoss = 0
      for (const option of options) {
        const intrinsic = option.optionType === 'CE'
          ? Math.max(strike - option.strikePrice, 0)
          : Math.max(option.strikePrice - strike, 0)
        totalLoss += intrinsic * option.openInterest
      }
      if (totalLoss < minLoss) { minLoss = totalLoss; maxPain = strike }
    }

    // Build chain format
    const strikeMap = new Map<number, { ce?: typeof options[0]; pe?: typeof options[0] }>()
    for (const opt of options) {
      if (!strikeMap.has(opt.strikePrice)) {
        strikeMap.set(opt.strikePrice, {})
      }
      const entry = strikeMap.get(opt.strikePrice)!
      if (opt.optionType === 'CE') entry.ce = opt
      else entry.pe = opt
    }

    const chain = Array.from(strikeMap.entries()).map(([strike, data]) => ({
      strikePrice: strike,
      expiryDate: (data.ce || data.pe)?.expiryDate.toISOString().split('T')[0] || '',
      ceLtp: data.ce?.ltp || 0,
      ceChange: data.ce?.change || 0,
      ceChangePercent: data.ce?.changePercent || 0,
      ceVolume: data.ce?.volume || 0,
      ceOI: data.ce?.openInterest || 0,
      ceOIChange: data.ce?.oiChange || 0,
      ceIV: data.ce?.impliedVolatility || 0,
      ceDelta: data.ce?.delta || 0,
      ceGamma: data.ce?.gamma || 0,
      ceTheta: data.ce?.theta || 0,
      ceVega: data.ce?.vega || 0,
      peLtp: data.pe?.ltp || 0,
      peChange: data.pe?.change || 0,
      peChangePercent: data.pe?.changePercent || 0,
      peVolume: data.pe?.volume || 0,
      peOI: data.pe?.openInterest || 0,
      peOIChange: data.pe?.oiChange || 0,
      peIV: data.pe?.impliedVolatility || 0,
      peDelta: data.pe?.delta || 0,
      peGamma: data.pe?.gamma || 0,
      peTheta: data.pe?.theta || 0,
      peVega: data.pe?.vega || 0,
    }))

    const expiries = [...new Set(options.map(o => o.expiryDate.toISOString().split('T')[0]))].sort()

    return NextResponse.json({
      success: true,
      data: {
        underlying: symbolUpper,
        underlyingPrice: spot,
        chain,
        pcr: Math.round(pcr * 100) / 100,
        maxPain,
        ivPercentile: 0,
        expiries,
        isRealData: false,
        dataSource: 'database',
      },
    })
  } catch (error) {
    console.error(`[API /stocks/option-chain] Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch option chain' },
      { status: 500 }
    )
  }
}
