import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''
    const segment = searchParams.get('segment') || ''
    const userId = searchParams.get('userId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const sortBy = searchParams.get('sortBy') || 'executedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { symbol: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    if (segment) {
      where.segment = segment
    }

    if (userId) {
      where.userId = userId
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      if (!isNaN(fromDate.getTime())) {
        where.executedAt = { ...where.executedAt, gte: fromDate }
      }
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999)
        where.executedAt = { ...where.executedAt, lte: toDate }
      }
    }

    // Validate sort field
    const allowedSortFields = [
      'executedAt', 'symbol', 'segment', 'fillPrice', 'totalValue',
      'pnl', 'pnlPercent', 'quantity',
    ]
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'executedAt'
    const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

    const [trades, total] = await Promise.all([
      db.trade.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              subscription: true,
              isActive: true,
            },
          },
        },
        orderBy: { [validSortBy]: validSortOrder },
        skip,
        take: limit,
      }),
      db.trade.count({ where }),
    ])

    return NextResponse.json({
      trades,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[Admin Trades API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
