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

    const skip = (page - 1) * limit

    // Build where clause - only open positions
    const where: any = {
      isOpen: true,
    }

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

    const [positions, total] = await Promise.all([
      db.position.findMany({
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.position.count({ where }),
    ])

    return NextResponse.json({
      positions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[Admin Positions API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
