import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error

    const userId = auth.userId

    // ─── Parallel: Get user + positions in 2 queries ────────────
    const [user, positions] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          virtualBalance: true,
          marginUsed: true,
          totalPnl: true,
          totalTrades: true,
        },
      }),
      db.position.findMany({
        where: { userId, isOpen: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If no positions, return fast
    if (positions.length === 0) {
      const totalPortfolioValue = user.virtualBalance
      const availableMargin = user.virtualBalance - user.marginUsed
      const initialCapital = 100000
      const totalReturn = Math.round(((totalPortfolioValue - initialCapital) / initialCapital) * 10000) / 100

      // Also get realized P&L from closed positions
      const closedAgg = await db.position.aggregate({
        where: { userId, isOpen: false },
        _sum: { realizedPnl: true },
      })

      return NextResponse.json({
        success: true,
        data: {
          virtualBalance: user.virtualBalance,
          marginUsed: user.marginUsed,
          availableMargin: Math.max(0, availableMargin),
          totalInvested: 0,
          totalCurrentValue: 0,
          totalUnrealizedPnl: 0,
          totalRealizedPnl: closedAgg._sum.realizedPnl || 0,
          totalPortfolioValue,
          totalPnl: user.totalPnl,
          totalReturn,
          totalTrades: user.totalTrades,
          initialCapital,
          openPositionsCount: 0,
          segments: {
            equity: { count: 0, invested: 0, currentValue: 0, unrealizedPnl: 0, positions: [] },
            futures: { count: 0, invested: 0, currentValue: 0, unrealizedPnl: 0, marginUsed: 0, positions: [] },
            options: { count: 0, invested: 0, currentValue: 0, unrealizedPnl: 0, marginUsed: 0, positions: [] },
          },
          // Include enriched positions so frontend doesn't need separate call
          positions: [],
        },
      })
    }

    // ─── Batch: Collect symbols for price lookup ────────────────
    const equitySymbols = new Set<string>()
    const futureSymbols = new Set<string>()
    const optionKeys: { underlying: string; optionType: string; strikePrice: number }[] = []

    for (const pos of positions) {
      if (pos.segment === 'EQUITY') {
        equitySymbols.add(pos.symbol.toUpperCase())
      } else if (pos.segment === 'FUTURES') {
        futureSymbols.add(pos.symbol.toUpperCase())
      } else if (pos.segment === 'OPTIONS' && pos.optionType && pos.strikePrice) {
        optionKeys.push({
          underlying: pos.symbol.toUpperCase(),
          optionType: pos.optionType,
          strikePrice: pos.strikePrice,
        })
      }
    }

    // ─── 3 parallel batch price queries ─────────────────────────
    const [stockPrices, futurePrices, optionPrices, closedAgg] = await Promise.all([
      equitySymbols.size > 0
        ? db.stock.findMany({
            where: { symbol: { in: Array.from(equitySymbols) }, isActive: true },
            select: { symbol: true, currentPrice: true, change: true, changePercent: true, name: true },
          })
        : Promise.resolve([]),
      futureSymbols.size > 0
        ? db.future.findMany({
            where: { underlying: { in: Array.from(futureSymbols) }, isActive: true },
            orderBy: { expiryDate: 'asc' },
            select: { underlying: true, ltp: true, change: true, changePercent: true },
          })
        : Promise.resolve([]),
      optionKeys.length > 0
        ? db.option.findMany({
            where: {
              OR: optionKeys.map(ok => ({
                underlying: ok.underlying,
                optionType: ok.optionType,
                strikePrice: ok.strikePrice,
                isActive: true,
              })),
            },
            orderBy: { expiryDate: 'asc' },
            select: { underlying: true, optionType: true, strikePrice: true, ltp: true, change: true, changePercent: true },
          })
        : Promise.resolve([]),
      // Get realized P&L aggregate instead of fetching all closed positions
      db.position.aggregate({
        where: { userId, isOpen: false },
        _sum: { realizedPnl: true },
      }),
    ])

    // ─── Build lookup maps ──────────────────────────────────────
    const stockPriceMap = new Map(stockPrices.map(s => [s.symbol.toUpperCase(), s]))
    const futurePriceMap = new Map(futurePrices.map(f => [f.underlying.toUpperCase(), f]))
    const optionPriceMap = new Map(
      optionPrices.map(o => [`${o.underlying.toUpperCase()}:${o.optionType}:${o.strikePrice}`, o])
    )

    // ─── Enrich positions (no DB writes!) ───────────────────────
    let totalInvested = 0
    let totalCurrentValue = 0
    let totalUnrealizedPnl = 0
    const equityPositions: (typeof positions[number] & { currentPrice: number; currentValue: number; unrealizedPnl: number; unrealizedPnlPercent: number })[] = []
    const futuresPositions: (typeof positions[number] & { currentPrice: number; currentValue: number; unrealizedPnl: number; unrealizedPnlPercent: number })[] = []
    const optionsPositions: (typeof positions[number] & { currentPrice: number; currentValue: number; unrealizedPnl: number; unrealizedPnlPercent: number })[] = []
    const allEnrichedPositions: (typeof positions[number] & { currentPrice: number; currentValue: number; unrealizedPnl: number; unrealizedPnlPercent: number })[] = []

    for (const position of positions) {
      let currentPrice = position.currentPrice

      if (position.segment === 'EQUITY') {
        const stockData = stockPriceMap.get(position.symbol.toUpperCase())
        if (stockData) currentPrice = stockData.currentPrice
      } else if (position.segment === 'FUTURES') {
        const futureData = futurePriceMap.get(position.symbol.toUpperCase())
        if (futureData) currentPrice = futureData.ltp
      } else if (position.segment === 'OPTIONS' && position.optionType && position.strikePrice) {
        const optKey = `${position.symbol.toUpperCase()}:${position.optionType}:${position.strikePrice}`
        const optionData = optionPriceMap.get(optKey)
        if (optionData) currentPrice = optionData.ltp
      }

      let unrealizedPnl: number
      if (position.tradeDirection === 'BUY') {
        unrealizedPnl = (currentPrice - position.entryPrice) * position.quantity
      } else {
        unrealizedPnl = (position.entryPrice - currentPrice) * position.quantity
      }
      unrealizedPnl = Math.round(unrealizedPnl * 100) / 100
      const currentValue = Math.round(position.quantity * currentPrice * 100) / 100

      totalInvested += position.totalInvested
      totalCurrentValue += currentValue
      totalUnrealizedPnl += unrealizedPnl

      const enrichedPosition = {
        ...position,
        currentPrice,
        currentValue,
        unrealizedPnl,
        unrealizedPnlPercent: position.totalInvested > 0
          ? Math.round((unrealizedPnl / position.totalInvested) * 10000) / 100
          : 0,
      }

      allEnrichedPositions.push(enrichedPosition)

      if (position.segment === 'EQUITY') {
        equityPositions.push(enrichedPosition)
      } else if (position.segment === 'FUTURES') {
        futuresPositions.push(enrichedPosition)
      } else {
        optionsPositions.push(enrichedPosition)
      }
    }

    // ─── Calculate portfolio metrics ────────────────────────────
    const totalPortfolioValue = user.virtualBalance + totalCurrentValue
    const availableMargin = user.virtualBalance - user.marginUsed
    const initialCapital = 100000
    const totalReturn = Math.round(((totalPortfolioValue - initialCapital) / initialCapital) * 10000) / 100
    const totalRealizedPnl = closedAgg._sum.realizedPnl || 0

    // ─── Cache prices for other API calls ───────────────────────
    for (const s of stockPrices) {
      cache.set(CacheKeys.stockPrice(s.symbol), s, CacheTTL.STOCK_PRICE)
    }
    for (const f of futurePrices) {
      cache.set(CacheKeys.futurePrice(f.underlying), f, CacheTTL.FUTURE_PRICE)
    }

    // ─── Invalidate user balance cache after read ───────────────
    cache.delete(CacheKeys.userBalance(userId))

    return NextResponse.json({
      success: true,
      data: {
        // Balance
        virtualBalance: user.virtualBalance,
        marginUsed: user.marginUsed,
        availableMargin: Math.max(0, availableMargin),

        // Position values
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
        totalUnrealizedPnl: Math.round(totalUnrealizedPnl * 100) / 100,
        totalRealizedPnl: Math.round(totalRealizedPnl * 100) / 100,

        // Portfolio
        totalPortfolioValue: Math.round(totalPortfolioValue * 100) / 100,
        totalPnl: user.totalPnl,
        totalReturn,
        totalTrades: user.totalTrades,
        initialCapital,

        // Segments
        segments: {
          equity: {
            count: equityPositions.length,
            invested: equityPositions.reduce((s, p) => s + p.totalInvested, 0),
            currentValue: equityPositions.reduce((s, p) => s + p.currentValue, 0),
            unrealizedPnl: equityPositions.reduce((s, p) => s + p.unrealizedPnl, 0),
            positions: equityPositions,
          },
          futures: {
            count: futuresPositions.length,
            invested: futuresPositions.reduce((s, p) => s + p.totalInvested, 0),
            currentValue: futuresPositions.reduce((s, p) => s + p.currentValue, 0),
            unrealizedPnl: futuresPositions.reduce((s, p) => s + p.unrealizedPnl, 0),
            marginUsed: futuresPositions.reduce((s, p) => s + p.marginUsed, 0),
            positions: futuresPositions,
          },
          options: {
            count: optionsPositions.length,
            invested: optionsPositions.reduce((s, p) => s + p.totalInvested, 0),
            currentValue: optionsPositions.reduce((s, p) => s + p.currentValue, 0),
            unrealizedPnl: optionsPositions.reduce((s, p) => s + p.unrealizedPnl, 0),
            marginUsed: optionsPositions.reduce((s, p) => s + p.marginUsed, 0),
            positions: optionsPositions,
          },
        },

        // Include enriched positions so frontend doesn't need separate call
        positions: allEnrichedPositions,
        openPositionsCount: positions.length,
      },
    })
  } catch (error) {
    console.error('[GET /api/trade/portfolio] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    )
  }
}
