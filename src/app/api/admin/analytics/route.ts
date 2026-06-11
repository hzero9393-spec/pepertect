import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error

    // ─── USER ANALYTICS ──────────────────────────────────────────

    // Win rate distribution
    const allUsers = await db.user.findMany({
      select: { winRate: true, totalTrades: true, totalPnl: true, subscription: true, isActive: true, createdAt: true, lastLoginAt: true },
    })

    const winRateBuckets: Record<string, number> = {
      '0-10%': 0,
      '10-20%': 0,
      '20-30%': 0,
      '30-40%': 0,
      '40-50%': 0,
      '50-60%': 0,
      '60-70%': 0,
      '70-80%': 0,
      '80-90%': 0,
      '90-100%': 0,
    }

    for (const user of allUsers) {
      if (user.totalTrades === 0) continue
      const bucket = Math.min(Math.floor(user.winRate / 10), 9)
      const key = `${bucket * 10}-${(bucket + 1) * 10}%`
      if (winRateBuckets[key] !== undefined) {
        winRateBuckets[key]++
      }
    }

    // Average profit/loss
    const usersWithTrades = allUsers.filter((u) => u.totalTrades > 0)
    const avgProfit = usersWithTrades.length > 0
      ? usersWithTrades.filter((u) => u.totalPnl > 0).reduce((sum, u) => sum + u.totalPnl, 0) /
        Math.max(usersWithTrades.filter((u) => u.totalPnl > 0).length, 1)
      : 0
    const avgLoss = usersWithTrades.length > 0
      ? usersWithTrades.filter((u) => u.totalPnl < 0).reduce((sum, u) => sum + u.totalPnl, 0) /
        Math.max(usersWithTrades.filter((u) => u.totalPnl < 0).length, 1)
      : 0

    // Trade frequency
    const tradeFreqBuckets: Record<string, number> = {
      '0': 0,
      '1-10': 0,
      '11-50': 0,
      '51-100': 0,
      '100+': 0,
    }
    for (const user of allUsers) {
      if (user.totalTrades === 0) tradeFreqBuckets['0']++
      else if (user.totalTrades <= 10) tradeFreqBuckets['1-10']++
      else if (user.totalTrades <= 50) tradeFreqBuckets['11-50']++
      else if (user.totalTrades <= 100) tradeFreqBuckets['51-100']++
      else tradeFreqBuckets['100+']++
    }

    // Retention rate (users active in last 30 days / total users)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const activeUsersIn30Days = allUsers.filter(
      (u) => u.lastLoginAt && new Date(u.lastLoginAt) >= thirtyDaysAgo
    ).length
    const retentionRate = allUsers.length > 0 ? (activeUsersIn30Days / allUsers.length) * 100 : 0

    // ─── BUSINESS ANALYTICS ──────────────────────────────────────

    // Conversion funnel
    const totalUsersCount = allUsers.length
    const emailVerifiedCount = (await db.user.count({ where: { isEmailVerified: true } }))
    const hasTradedCount = (await db.user.count({ where: { totalTrades: { gt: 0 } } }))
    const premiumCount = allUsers.filter((u) => u.subscription === 'PREMIUM').length

    const conversionFunnel = {
      totalUsers: totalUsersCount,
      emailVerified: emailVerifiedCount,
      hasTraded: hasTradedCount,
      premium: premiumCount,
    }

    // Revenue trends (monthly for last 12 months)
    const revenueTrends: { month: string; premiumUsers: number; revenue: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      // Count premium users who were created before the end of this month
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const premiumUsersBeforeMonth = allUsers.filter(
        (u) => u.subscription === 'PREMIUM' && new Date(u.createdAt) <= endOfMonth
      ).length

      const subscriptionPriceSetting = await db.platformSettings.findUnique({
        where: { key: 'subscription_price' },
      })
      const price = subscriptionPriceSetting ? parseFloat(subscriptionPriceSetting.value) : 99

      revenueTrends.push({
        month: monthKey,
        premiumUsers: premiumUsersBeforeMonth,
        revenue: premiumUsersBeforeMonth * price,
      })
    }

    // Churn rate (premium users who became inactive in last 30 days)
    const churnedPremium = await db.user.count({
      where: {
        subscription: 'PREMIUM',
        isActive: false,
        updatedAt: { gte: thirtyDaysAgo },
      },
    })
    const churnRate = premiumCount > 0 ? (churnedPremium / premiumCount) * 100 : 0

    // Engagement (average trades per active user)
    const activeUsersList = allUsers.filter((u) => u.isActive)
    const avgTradesPerUser = activeUsersList.length > 0
      ? activeUsersList.reduce((sum, u) => sum + u.totalTrades, 0) / activeUsersList.length
      : 0

    // ─── TRADING ANALYTICS ───────────────────────────────────────

    // Most traded stocks
    const trades = await db.trade.findMany({
      select: { symbol: true, segment: true, executedAt: true },
    })

    const symbolCount: Record<string, number> = {}
    for (const trade of trades) {
      symbolCount[trade.symbol] = (symbolCount[trade.symbol] || 0) + 1
    }
    const mostTradedStocks = Object.entries(symbolCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([symbol, count]) => ({ symbol, count }))

    // Peak trading hours
    const hourCount: Record<number, number> = {}
    for (let h = 0; h < 24; h++) {
      hourCount[h] = 0
    }
    for (const trade of trades) {
      const hour = new Date(trade.executedAt).getHours()
      hourCount[hour] = (hourCount[hour] || 0) + 1
    }
    const peakTradingHours = Object.entries(hourCount)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)

    // Segment distribution
    const segmentCount: Record<string, number> = {}
    for (const trade of trades) {
      segmentCount[trade.segment] = (segmentCount[trade.segment] || 0) + 1
    }
    const segmentDistribution = Object.entries(segmentCount)
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      userAnalytics: {
        winRateDistribution: winRateBuckets,
        avgProfit: Math.round(avgProfit * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        tradeFrequency: tradeFreqBuckets,
        retentionRate: Math.round(retentionRate * 100) / 100,
      },
      businessAnalytics: {
        conversionFunnel,
        revenueTrends,
        churnRate: Math.round(churnRate * 100) / 100,
        engagement: {
          avgTradesPerUser: Math.round(avgTradesPerUser * 100) / 100,
          activeUsers: activeUsersList.length,
          premiumUsers: premiumCount,
        },
      },
      tradingAnalytics: {
        mostTradedStocks,
        peakTradingHours,
        segmentDistribution,
        totalTrades: trades.length,
      },
    })
  } catch (error) {
    console.error('[Admin Analytics API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
