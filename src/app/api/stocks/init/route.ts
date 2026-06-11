import { db } from '@/lib/db'
import { ALL_STOCKS } from '@/lib/stock-data'
import { NextResponse } from 'next/server'

// Cache for 1 hour to avoid running too often
export const revalidate = 3600

export async function GET() {
  try {
    let upserted = 0
    let errors = 0

    for (const stock of ALL_STOCKS) {
      try {
        await db.stock.upsert({
          where: { symbol: stock.symbol },
          update: {
            name: stock.name,
            sector: stock.sector,
            currentPrice: stock.currentPrice,
            marketCap: stock.marketCap,
            isin: stock.isin,
            lotSize: stock.lotSize,
            isFuturesAvailable: stock.isFuturesAvailable,
            isOptionsAvailable: stock.isOptionsAvailable,
            isActive: true,
          },
          create: {
            symbol: stock.symbol,
            name: stock.name,
            sector: stock.sector,
            currentPrice: stock.currentPrice,
            marketCap: stock.marketCap,
            isin: stock.isin,
            lotSize: stock.lotSize,
            isFuturesAvailable: stock.isFuturesAvailable,
            isOptionsAvailable: stock.isOptionsAvailable,
            exchange: 'NSE',
            circuitLimit: 20,
            strikeInterval: Math.round(stock.currentPrice / 50) * 5 || 10,
            isActive: true,
          },
        })
        upserted++
      } catch {
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      upserted,
      errors,
      total: ALL_STOCKS.length,
      message: `Initialized ${upserted} stocks (${errors} errors)`,
    })
  } catch (error) {
    console.error('[API /stocks/init] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to initialize stocks' },
      { status: 500 }
    )
  }
}
