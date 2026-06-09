import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error

    // Total users
    const totalUsers = await db.user.count()

    // Active users (lastLoginAt within 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const activeUsers = await db.user.count({
      where: {
        lastLoginAt: { gte: sevenDaysAgo },
        isActive: true,
      },
    })

    // Subscription breakdown
    const paidUsers = await db.user.count({
      where: { subscription: 'PREMIUM' },
    })
    const freeUsers = await db.user.count({
      where: { subscription: 'FREE' },
    })

    // Conversion rate
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0

    // Total revenue
    const subscriptionPriceSetting = await db.platformSettings.findUnique({
      where: { key: 'subscription_price' },
    })
    const subscriptionPrice = subscriptionPriceSetting
      ? parseFloat(subscriptionPriceSetting.value)
      : 99
    const totalRevenue = paidUsers * subscriptionPrice

    // Total trades
    const totalTrades = await db.trade.count()

    // User growth data (users grouped by month for last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    const usersWithDates = await db.user.findMany({
      where: {
        createdAt: { gte: twelveMonthsAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Group by month
    const userGrowth: { month: string; count: number }[] = []
    const monthMap = new Map<string, number>()

    for (let i = 0; i < 12; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - (11 - i))
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, 0)
    }

    for (const user of usersWithDates) {
      const key = `${user.createdAt.getFullYear()}-${String(user.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (monthMap.has(key)) {
        monthMap.set(key, (monthMap.get(key) || 0) + 1)
      }
    }

    // Cumulative growth
    let cumulative = totalUsers - usersWithDates.length
    for (const [month, count] of monthMap) {
      cumulative += count
      userGrowth.push({ month, count: cumulative })
    }

    // Recent trades (last 10 with user info)
    const recentTrades = await db.trade.findMany({
      take: 10,
      orderBy: { executedAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Recent activity (last 10 activity logs with admin info)
    const recentActivity = await db.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { id: true, username: true, name: true },
        },
      },
    })

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        paidUsers,
        freeUsers,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalRevenue,
        totalTrades,
      },
      userGrowth,
      recentTrades: recentTrades.map((t) => ({
        id: t.id,
        symbol: t.symbol,
        segment: t.segment,
        tradeDirection: t.tradeDirection,
        quantity: t.quantity,
        fillPrice: t.fillPrice,
        totalValue: t.totalValue,
        pnl: t.pnl,
        pnlPercent: t.pnlPercent,
        executedAt: t.executedAt,
        user: t.user,
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        targetId: a.targetId,
        details: a.details,
        ipAddress: a.ipAddress,
        createdAt: a.createdAt,
        admin: a.admin,
      })),
    })
  } catch (error) {
    console.error('[Admin Dashboard API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
