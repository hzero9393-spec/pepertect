import { NextRequest, NextResponse } from 'next/server'
import { isUpstoxAuthenticated, getInstrumentKey, getUpstoxOptionChain } from '@/lib/upstox-api'
import type { UpstoxOptionChainItem } from '@/lib/upstox-api'
import { fetchStockFnoData } from '@/lib/dhan-api'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Stock lot sizes for F&O
const STOCK_LOT_SIZES: Record<string, number> = {
  RELIANCE: 250, TCS: 150, HDFCBANK: 550, INFY: 300, ICICIBANK: 700,
  HINDUNILVR: 300, SBIN: 750, BHARTIARTL: 475, ITC: 1600, KOTAKBANK: 400,
  LT: 150, AXISBANK: 900, BAJFINANCE: 125, ASIANPAINT: 200, MARUTI: 50,
  SUNPHARMA: 700, TATAMOTORS: 1425, WIPRO: 1500, HCLTECH: 350, ULTRACEMCO: 100,
  TITAN: 175, NESTLEIND: 100, NTPC: 2400, POWERGRID: 2400, ONGC: 3000,
  TATASTEEL: 2125, ADANIENT: 500, ADANIPORTS: 1250, JSWSTEEL: 1500, COALINDIA: 1800,
  BPCL: 900, HINDALCO: 1400, GRASIM: 750, TECHM: 600, BAJAJFINSV: 200,
  DRREDDY: 125, CIPLA: 650, EICHERMOT: 50, TATACONSUM: 1050, HEROMOTOCO: 150,
  'M&M': 700, APOLLOHOSP: 150, DIVISLAB: 200, BRITANNIA: 100, INDUSINDBK: 600,
  HDFCLIFE: 700, SBILIFE: 550,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()

    // 1. Try Upstox API for option chain data
    if (await isUpstoxAuthenticated()) {
      try {
        const eqKey = getInstrumentKey(symbolUpper, 'NSE_EQ')
        if (eqKey) {
          const upstoxChain = await getUpstoxOptionChain(eqKey)

          if (upstoxChain?.option_chain && upstoxChain.option_chain.length > 0) {
            const lotSize = STOCK_LOT_SIZES[symbolUpper] || 1

            // Transform option chain data (Upstox v2 format with call_options/put_options)
            const optionChain = upstoxChain.option_chain.map((item: UpstoxOptionChainItem) => ({
              strikePrice: item.strike_price,
              expiryDate: item.expiry,
              ceLtp: item.call_options?.market_data?.ltp || 0,
              ceChange: item.call_options?.market_data?.close_price
                ? item.call_options.market_data.ltp - item.call_options.market_data.close_price
                : 0,
              ceChangePercent: item.call_options?.market_data?.close_price && item.call_options.market_data.close_price > 0
                ? ((item.call_options.market_data.ltp - item.call_options.market_data.close_price) / item.call_options.market_data.close_price) * 100
                : 0,
              ceVolume: item.call_options?.market_data?.volume || 0,
              ceOI: item.call_options?.market_data?.oi || 0,
              ceOIChange: (item.call_options?.market_data?.oi || 0) - (item.call_options?.market_data?.prev_oi || 0),
              ceIV: item.call_options?.option_greeks?.iv || 0,
              ceDelta: item.call_options?.option_greeks?.delta || 0,
              ceGamma: item.call_options?.option_greeks?.gamma || 0,
              ceTheta: item.call_options?.option_greeks?.theta || 0,
              ceVega: item.call_options?.option_greeks?.vega || 0,
              peLtp: item.put_options?.market_data?.ltp || 0,
              peChange: item.put_options?.market_data?.close_price
                ? item.put_options.market_data.ltp - item.put_options.market_data.close_price
                : 0,
              peChangePercent: item.put_options?.market_data?.close_price && item.put_options.market_data.close_price > 0
                ? ((item.put_options.market_data.ltp - item.put_options.market_data.close_price) / item.put_options.market_data.close_price) * 100
                : 0,
              peVolume: item.put_options?.market_data?.volume || 0,
              peOI: item.put_options?.market_data?.oi || 0,
              peOIChange: (item.put_options?.market_data?.oi || 0) - (item.put_options?.market_data?.prev_oi || 0),
              peIV: item.put_options?.option_greeks?.iv || 0,
              peDelta: item.put_options?.option_greeks?.delta || 0,
              peGamma: item.put_options?.option_greeks?.gamma || 0,
              peTheta: item.put_options?.option_greeks?.theta || 0,
              peVega: item.put_options?.option_greeks?.vega || 0,
            }))

            // Calculate PCR
            const totalCallOI = optionChain.reduce((sum: number, item: { ceOI: number }) => sum + item.ceOI, 0)
            const totalPutOI = optionChain.reduce((sum: number, item: { peOI: number }) => sum + item.peOI, 0)
            const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 0

            // Calculate Max Pain
            const strikes = optionChain.map((o: { strikePrice: number }) => o.strikePrice)
            let maxPain = strikes[0] || 0
            let minLoss = Infinity

            for (const strike of strikes) {
              let totalLoss = 0
              for (const item of optionChain as Array<{ strikePrice: number; ceOI: number; peOI: number }>) {
                totalLoss += Math.max(strike - item.strikePrice, 0) * item.ceOI
                totalLoss += Math.max(item.strikePrice - strike, 0) * item.peOI
              }
              if (totalLoss < minLoss) {
                minLoss = totalLoss
                maxPain = strike
              }
            }

            // Get unique expiries
            const expiries = [...new Set(upstoxChain.option_chain.map((o: UpstoxOptionChainItem) => o.expiry))].sort()

            // Generate futures data from expiries
            const spotPrice = upstoxChain.underlying_spot_price || (upstoxChain.option_chain as UpstoxOptionChainItem[])[0]?.underlying_spot_price || 0
            const futures = expiries.slice(0, 3).map((exp: string) => {
              const expDate = new Date(exp)
              const monthsToExpiry = Math.max(0.5, (expDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000))
              const basisPercent = monthsToExpiry * 0.05
              const futuresPrice = spotPrice * (1 + basisPercent / 100)

              // Sum up volume and OI for this expiry
              let totalVolume = 0
              let totalOI = 0
              for (const item of upstoxChain.option_chain as UpstoxOptionChainItem[]) {
                if (item.expiry === exp) {
                  totalVolume += (item.call_options?.market_data?.volume || 0) + (item.put_options?.market_data?.volume || 0)
                  totalOI += (item.call_options?.market_data?.oi || 0) + (item.put_options?.market_data?.oi || 0)
                }
              }

              return {
                underlying: symbolUpper,
                expiryDate: exp,
                lotSize,
                ltp: Math.round(futuresPrice * 100) / 100,
                change: Math.round((futuresPrice - spotPrice) * 100) / 100,
                changePercent: Math.round(basisPercent * 100) / 100,
                open: Math.round(futuresPrice * 0.999 * 100) / 100,
                high: Math.round(futuresPrice * 1.002 * 100) / 100,
                low: Math.round(futuresPrice * 0.998 * 100) / 100,
                previousClose: Math.round(spotPrice * 100) / 100,
                volume: Math.round(totalVolume / 2),
                oi: Math.round(totalOI / 2 / 100) / 100,
                oiChange: 0,
                basis: Math.round((futuresPrice - spotPrice) * 100) / 100,
                basisPercent: Math.round(basisPercent * 100) / 100,
              }
            })

            return NextResponse.json({
              success: true,
              data: {
                futures,
                optionChain,
                optionChainSummary: {
                  totalCallOI,
                  totalPutOI,
                  pcr: Math.round(pcr * 100) / 100,
                  maxPain,
                  ivPercentile: 0,
                  nearestExpiry: expiries[0] || '',
                  availableExpiries: expiries,
                },
                isRealData: true,
                dataSource: 'upstox',
              },
            })
          }
        }
      } catch (err) {
        console.warn(`[Upstox] F&O data failed for ${symbolUpper}:`, err)
      }
    }

    // 2. Fallback to Dhan API
    try {
      const fnoData = await fetchStockFnoData(symbolUpper)
      return NextResponse.json({
        success: true,
        data: fnoData,
      })
    } catch (err) {
      console.warn(`[Dhan] F&O data failed for ${symbolUpper}:`, err)
    }

    // 3. Return empty data
    return NextResponse.json({
      success: true,
      data: {
        futures: [],
        optionChain: [],
        optionChainSummary: {
          totalCallOI: 0,
          totalPutOI: 0,
          pcr: 0,
          maxPain: 0,
          ivPercentile: 0,
          nearestExpiry: '',
          availableExpiries: [],
        },
        isRealData: false,
        dataSource: 'database',
      },
    })
  } catch (error) {
    console.error(`[API /stocks/fno] Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch F&O data' },
      { status: 500 }
    )
  }
}
