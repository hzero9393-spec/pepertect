import { NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getInstrumentKey, getUpstoxOptionChain } from '@/lib/upstox-api'
import type { UpstoxOptionChainItem } from '@/lib/upstox-api'
import { isDhanConfigured, getSecurityId, getDhanOptionChain } from '@/lib/dhan-api'
import { getNSEIndexOptionChain, getNSEStockOptionChain } from '@/lib/nse-api'
import { getExpiryDates } from '@/lib/upstox-instruments'
import { db } from '@/lib/db'

// Force dynamic - no caching, fresh data every request
export const dynamic = 'force-dynamic'
export const revalidate = 0

const FINANCE_GATEWAY = 'https://internal-api.z.ai'
const FINANCE_PREFIX = '/external/finance'

// Yahoo Finance symbol mapping for indices
const YAHOO_INDEX_MAP: Record<string, string> = {
  NIFTY: '^NSEI',
  BANKNIFTY: '^NSEBANK',
  FINNIFTY: '^CRSLDX',
  SENSEX: '^BSESN',
  MIDCPNIFTY: '^CRMIDCAP',
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

    // 1. Try Upstox API for option chain
    if (await isUpstoxAuthenticated()) {
      try {
        const indexKey = getInstrumentKey(underlyingUpper, 'NSE_INDEX')
        const instrumentKey = indexKey || getInstrumentKey(underlyingUpper, 'NSE_EQ')

        if (instrumentKey) {
          const upstoxChain = await getUpstoxOptionChain(instrumentKey, expiry || undefined)

          if (upstoxChain?.option_chain && upstoxChain.option_chain.length > 0) {
            // Transform Upstox v2 format to our format
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
                bidPrice: item.call_options.market_data?.bid_price || 0,
                askPrice: item.call_options.market_data?.ask_price || 0,
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
                bidPrice: item.put_options.market_data?.bid_price || 0,
                askPrice: item.put_options.market_data?.ask_price || 0,
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

            const spotPrice = upstoxChain.underlying_spot_price || 0

            // Also fetch available expiries from instruments data
            let expiries: string[] = []
            let nearestExpiry = ''
            try {
              expiries = await getExpiryDates(underlyingUpper)
              const today = new Date().toISOString().split('T')[0]
              nearestExpiry = expiries.find(e => e >= today) || expiries[0] || ''
            } catch (expErr) {
              console.warn(`[Upstox] Expiry dates fetch failed for ${underlyingUpper}:`, expErr)
            }

            return NextResponse.json({
              success: true,
              data: {
                chain,
                spot: spotPrice,
                pcr: Math.round(pcr * 100) / 100,
                maxPain,
                ...(expiries.length > 0 ? { expiries, nearestExpiry } : {}),
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

    // 2. Try Dhan API for option chain
    if (isDhanConfigured()) {
      try {
        const foId = getSecurityId(underlyingUpper, 'NSE_FO')
        const indexId = getSecurityId(underlyingUpper, 'NSE_FO')
        const dhanId = foId || indexId

        if (dhanId) {
          const segment = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX'].includes(underlyingUpper) ? 'INDEX' : 'STOCK'
          const dhanChain = await getDhanOptionChain(dhanId, segment)

          if (dhanChain && dhanChain.optionChain?.length > 0) {
            let chain = dhanChain.optionChain
            if (expiry) {
              chain = chain.filter(item => item.expiryDate === expiry)
            }

            const transformedChain = chain.map(item => ({
              strikePrice: item.strikePrice,
              expiryDate: item.expiryDate,
              ce: {
                ltp: item.ceLtp,
                change: item.ceChange,
                changePercent: item.ceChangePercent,
                volume: item.ceVolume,
                openInterest: item.ceOI,
                oiChange: item.ceOIChange,
                impliedVolatility: item.ceIV,
                delta: item.ceDelta,
                gamma: item.ceGamma,
                theta: item.ceTheta,
                vega: item.ceVega,
              },
              pe: {
                ltp: item.peLtp,
                change: item.peChange,
                changePercent: item.peChangePercent,
                volume: item.peVolume,
                openInterest: item.peOI,
                oiChange: item.peOIChange,
                impliedVolatility: item.peIV,
                delta: item.peDelta,
                gamma: item.peGamma,
                theta: item.peTheta,
                vega: item.peVega,
              },
            }))

            const totalCEOI = transformedChain.reduce((sum, item) => sum + (item.ce?.openInterest || 0), 0)
            const totalPEOI = transformedChain.reduce((sum, item) => sum + (item.pe?.openInterest || 0), 0)
            const pcr = totalCEOI > 0 ? totalPEOI / totalCEOI : 0

            const strikes = transformedChain.map(item => item.strikePrice)
            let maxPain = strikes[0] || 0
            let minLoss = Infinity
            for (const strike of strikes) {
              let totalLoss = 0
              for (const item of transformedChain) {
                if (item.ce) totalLoss += Math.max(strike - item.strikePrice, 0) * (item.ce.openInterest || 0)
                if (item.pe) totalLoss += Math.max(item.strikePrice - strike, 0) * (item.pe.openInterest || 0)
              }
              if (totalLoss < minLoss) { minLoss = totalLoss; maxPain = strike }
            }

            return NextResponse.json({
              success: true,
              data: {
                chain: transformedChain,
                spot: dhanChain.underlyingPrice,
                pcr: dhanChain.pcr || Math.round(pcr * 100) / 100,
                maxPain: dhanChain.maxPain || maxPain,
                isRealData: true,
                dataSource: 'dhan',
              },
            })
          }
        }
      } catch (err) {
        console.warn(`[Dhan] Option chain failed for ${underlyingUpper}:`, err)
      }
    }

    // 3. Try NSE India API for option chain (free, no auth needed)
    try {
      // Try as index first, then as stock
      const nseChain = await getNSEIndexOptionChain(underlyingUpper).catch(() => null)
        || await getNSEStockOptionChain(underlyingUpper).catch(() => null)

      if (nseChain && nseChain.chain.length > 0) {
        // Filter by expiry if specified
        let chainData = nseChain.chain
        if (expiry) {
          chainData = chainData.filter(item => item.expiryDate === expiry)
        }

        // Transform NSE format to our API format
        const chain = chainData.map(item => ({
          strikePrice: item.strikePrice,
          expiryDate: item.expiryDate,
          ce: item.ce ? {
            ltp: item.ce.ltp,
            change: item.ce.change,
            changePercent: item.ce.changePercent,
            volume: item.ce.volume,
            openInterest: item.ce.openInterest,
            oiChange: item.ce.oiChange,
            impliedVolatility: item.ce.impliedVolatility,
          } : null,
          pe: item.pe ? {
            ltp: item.pe.ltp,
            change: item.pe.change,
            changePercent: item.pe.changePercent,
            volume: item.pe.volume,
            openInterest: item.pe.openInterest,
            oiChange: item.pe.oiChange,
            impliedVolatility: item.pe.impliedVolatility,
          } : null,
        }))

        return NextResponse.json({
          success: true,
          data: {
            chain,
            spot: nseChain.spot,
            pcr: nseChain.pcr,
            maxPain: nseChain.maxPain,
            expiries: nseChain.expiries,
            isRealData: true,
            dataSource: 'nse',
          },
        })
      }
    } catch (err) {
      console.warn(`[NSE] Option chain failed for ${underlyingUpper}:`, err)
    }

    // 4. Fallback to database
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

    // If no DB data either, try to get at least the spot price
    if (options.length === 0) {
      let spotPrice = 0
      let spotSource = 'database'

      // Try Yahoo Finance for spot price
      if (YAHOO_INDEX_MAP[underlyingUpper]) {
        try {
          const yahooSym = YAHOO_INDEX_MAP[underlyingUpper]
          const res = await fetch(
            `${FINANCE_GATEWAY}${FINANCE_PREFIX}/v1/markets/quote?ticker=${encodeURIComponent(yahooSym)}&type=STOCKS`,
            { headers: { 'X-Z-AI-From': 'Z' }, cache: 'no-store' }
          )
          if (res.ok) {
            const json = await res.json()
            const body = json?.body
            if (body) {
              const price = parseFloat(String(body.regularMarketPrice?.raw || body.regularMarketPrice || '0'))
              if (price > 0) {
                spotPrice = price
                spotSource = 'yahoo'
              }
            }
          }
        } catch { /* silent */ }
      }

      // Try DB for spot price as last resort
      if (spotPrice === 0) {
        const idx = await db.index.findUnique({ where: { symbol: underlyingUpper } })
        if (idx && idx.currentPrice > 0) {
          spotPrice = idx.currentPrice
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          chain: [],
          spot: spotPrice,
          pcr: 0,
          maxPain: 0,
          expiries: [],
          isRealData: spotPrice > 0 && spotSource !== 'database',
          dataSource: spotSource,
        },
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
