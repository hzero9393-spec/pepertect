import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'

// GET /api/trade/watchlist — Get user's watchlist with stock details
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error

    const userId = auth.userId

    const watchlistItems = await db.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    })

    if (watchlistItems.length === 0) {
      return NextResponse.json({ success: true, data: [], count: 0 })
    }

    // Batch fetch stock details for all watchlist symbols
    const symbols = watchlistItems.map(item => item.symbol)
    const stocks = await db.stock.findMany({
      where: {
        symbol: { in: symbols },
        isActive: true,
      },
      select: {
        symbol: true,
        name: true,
        currentPrice: true,
        change: true,
        changePercent: true,
        sector: true,
        lotSize: true,
        isFnoBan: true,
        isFuturesAvailable: true,
        isOptionsAvailable: true,
        volume: true,
        marketCap: true,
        week52High: true,
        week52Low: true,
        peRatio: true,
      },
    })

    // Build lookup map for O(1) access
    const stockMap = new Map(stocks.map(s => [s.symbol, s]))

    // Merge watchlist items with stock data
    const enrichedItems = watchlistItems.map(item => {
      const stock = stockMap.get(item.symbol)
      return {
        id: item.id,
        symbol: item.symbol,
        addedAt: item.addedAt,
        // Stock details (may be null if stock not found)
        stock: stock || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedItems,
      count: enrichedItems.length,
    })
  } catch (error) {
    console.error('[GET /api/trade/watchlist] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    )
  }
}

// POST /api/trade/watchlist — Add stock to watchlist
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error

    const userId = auth.userId
    const body = await request.json()
    const { symbol } = body

    if (!symbol || typeof symbol !== 'string') {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      )
    }

    const upperSymbol = symbol.toUpperCase()

    // Verify stock exists
    const stock = await db.stock.findUnique({
      where: { symbol: upperSymbol },
      select: { symbol: true, name: true },
    })

    if (!stock) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      )
    }

    // Check if already in watchlist (unique constraint will also catch this)
    const existing = await db.watchlistItem.findUnique({
      where: { userId_symbol: { userId, symbol: upperSymbol } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Stock already in watchlist', data: existing },
        { status: 409 }
      )
    }

    // Max 50 items per watchlist
    const count = await db.watchlistItem.count({ where: { userId } })
    if (count >= 50) {
      return NextResponse.json(
        { error: 'Watchlist limit reached (max 50 stocks)' },
        { status: 400 }
      )
    }

    const item = await db.watchlistItem.create({
      data: {
        userId,
        symbol: upperSymbol,
      },
    })

    return NextResponse.json({
      success: true,
      data: item,
      message: `${stock.name || upperSymbol} added to watchlist`,
    })
  } catch (error) {
    console.error('[POST /api/trade/watchlist] Error:', error)
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    )
  }
}

// DELETE /api/trade/watchlist — Remove stock from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error

    const userId = auth.userId
    const body = await request.json()
    const { symbol, id } = body

    let deletedSymbol = ''

    if (id) {
      // Delete by ID — verify ownership first
      const item = await db.watchlistItem.findFirst({
        where: { id, userId },
      })
      if (!item) {
        return NextResponse.json(
          { error: 'Item not found in watchlist' },
          { status: 404 }
        )
      }
      await db.watchlistItem.delete({ where: { id } })
      deletedSymbol = item.symbol
    } else if (symbol) {
      const upperSymbol = symbol.toUpperCase()
      // Use deleteMany with filter (safe, won't throw if not found)
      const result = await db.watchlistItem.deleteMany({
        where: { userId, symbol: upperSymbol },
      })
      if (result.count === 0) {
        return NextResponse.json(
          { error: 'Item not found in watchlist' },
          { status: 404 }
        )
      }
      deletedSymbol = upperSymbol
    } else {
      return NextResponse.json(
        { error: 'Either symbol or id is required' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${deletedSymbol} removed from watchlist`,
    })
  } catch (error) {
    console.error('[DELETE /api/trade/watchlist] Error:', error)
    return NextResponse.json(
      { error: 'Failed to remove from watchlist' },
      { status: 500 }
    )
  }
}
