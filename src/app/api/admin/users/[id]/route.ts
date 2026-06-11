import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAdmin, getClientIp } from '@/lib/admin-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Single user detail
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error

    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      include: {
        trades: {
          orderBy: { executedAt: 'desc' },
          take: 50,
        },
        positions: {
          where: { isOpen: true },
          orderBy: { createdAt: 'desc' },
        },
        portfolios: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate performance stats
    const totalTrades = user.trades.length
    const winningTrades = user.trades.filter((t) => (t.pnl ?? 0) > 0).length
    const losingTrades = user.trades.filter((t) => (t.pnl ?? 0) < 0).length
    const totalPnl = user.trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0
    const bestTrade = user.trades.length > 0
      ? user.trades.reduce((best, t) => ((t.pnl ?? 0) > (best.pnl ?? 0) ? t : best), user.trades[0])
      : null
    const worstTrade = user.trades.length > 0
      ? user.trades.reduce((worst, t) => ((t.pnl ?? 0) < (worst.pnl ?? 0) ? t : worst), user.trades[0])
      : null

    // Segment breakdown
    const segmentBreakdown: Record<string, { count: number; pnl: number }> = {}
    for (const trade of user.trades) {
      if (!segmentBreakdown[trade.segment]) {
        segmentBreakdown[trade.segment] = { count: 0, pnl: 0 }
      }
      segmentBreakdown[trade.segment].count += 1
      segmentBreakdown[trade.segment].pnl += trade.pnl ?? 0
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        panNumber: user.panNumber,
        role: user.role,
        subscription: user.subscription,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      wallet: {
        virtualBalance: user.virtualBalance,
        marginUsed: user.marginUsed,
        totalPnl: user.totalPnl,
        winRate: user.winRate,
        totalTrades: user.totalTrades,
      },
      trades: user.trades,
      openPositions: user.positions,
      recentPortfolios: user.portfolios,
      performanceStats: {
        totalTrades,
        winningTrades,
        losingTrades,
        totalPnl,
        avgPnl: Math.round(avgPnl * 100) / 100,
        bestTrade: bestTrade ? {
          id: bestTrade.id,
          symbol: bestTrade.symbol,
          pnl: bestTrade.pnl,
          executedAt: bestTrade.executedAt,
        } : null,
        worstTrade: worstTrade ? {
          id: worstTrade.id,
          symbol: worstTrade.symbol,
          pnl: worstTrade.pnl,
          executedAt: worstTrade.executedAt,
        } : null,
        segmentBreakdown,
      },
    })
  } catch (error) {
    console.error('[Admin User Detail API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Update user
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error
    const admin = result.admin!

    const { id } = await params
    const body = await request.json()
    const { name, email, isActive, subscription, virtualBalance } = body

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: any = {}
    const changes: string[] = []

    if (name !== undefined && name !== user.name) {
      updateData.name = name
      changes.push(`name: ${user.name} → ${name}`)
    }
    if (email !== undefined && email !== user.email) {
      updateData.email = email
      changes.push(`email: ${user.email} → ${email}`)
    }
    if (isActive !== undefined && isActive !== user.isActive) {
      updateData.isActive = isActive
      changes.push(`isActive: ${user.isActive} → ${isActive}`)
    }
    if (subscription !== undefined && subscription !== user.subscription) {
      updateData.subscription = subscription
      changes.push(`subscription: ${user.subscription} → ${subscription}`)
    }
    if (virtualBalance !== undefined && virtualBalance !== user.virtualBalance) {
      updateData.virtualBalance = virtualBalance
      changes.push(`virtualBalance: ${user.virtualBalance} → ${virtualBalance}`)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
    })

    // Create activity log
    const ipAddress = getClientIp(request)
    await db.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'USER_UPDATE',
        targetId: id,
        details: JSON.stringify({
          userName: user.name,
          changes,
        }),
        ipAddress,
      },
    })

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        subscription: updatedUser.subscription,
        isActive: updatedUser.isActive,
        virtualBalance: updatedUser.virtualBalance,
      },
    })
  } catch (error) {
    console.error('[Admin User Update API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Soft delete user (set isActive=false)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error
    const admin = result.admin!

    const { id } = await params

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Soft delete
    await db.user.update({
      where: { id },
      data: { isActive: false },
    })

    // Create activity log
    const ipAddress = getClientIp(request)
    await db.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'USER_DELETE',
        targetId: id,
        details: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          method: 'soft_delete',
        }),
        ipAddress,
      },
    })

    return NextResponse.json({
      message: 'User deleted successfully (soft delete)',
    })
  } catch (error) {
    console.error('[Admin User Delete API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
