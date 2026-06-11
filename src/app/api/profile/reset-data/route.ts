import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error

    const userId = auth.userId

    // Verify the user sent a confirmation body
    const body = await request.json()
    if (body.confirmation !== 'RESET_ALL_DATA') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirmation: "RESET_ALL_DATA" }' },
        { status: 400 }
      )
    }

    // Delete all trading data for this user
    const deleteResults = await Promise.all([
      db.trade.deleteMany({ where: { userId } }),
      db.order.deleteMany({ where: { userId } }),
      db.position.deleteMany({ where: { userId } }),
      db.portfolio.deleteMany({ where: { userId } }),
      db.watchlistItem.deleteMany({ where: { userId } }),
      db.notification.deleteMany({ where: { userId } }),
    ])

    // Reset user stats to fresh state
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        virtualBalance: 100000,
        marginUsed: 0,
        totalTrades: 0,
        winRate: 0,
        totalPnl: 0,
        rank: null,
        dailyTrades: 0,
        dailyPositions: 0,
        lastResetDate: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'All trading data has been reset successfully',
      deleted: {
        trades: deleteResults[0].count,
        orders: deleteResults[1].count,
        positions: deleteResults[2].count,
        portfolioSnapshots: deleteResults[3].count,
        watchlistItems: deleteResults[4].count,
        notifications: deleteResults[5].count,
      },
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        virtualBalance: updatedUser.virtualBalance,
        marginUsed: updatedUser.marginUsed,
        totalTrades: updatedUser.totalTrades,
        winRate: updatedUser.winRate,
        totalPnl: updatedUser.totalPnl,
      },
    })
  } catch (error) {
    console.error('[POST /api/profile/reset-data] Error:', error)
    return NextResponse.json(
      { error: 'Failed to reset data. Please try again.' },
      { status: 500 }
    )
  }
}
