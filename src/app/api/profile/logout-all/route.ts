import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId

    // Get current token from the request
    const currentToken = auth.token

    // Delete all sessions except the current one
    const result = await db.session.deleteMany({
      where: {
        userId,
        token: { not: currentToken },
      },
    })

    return NextResponse.json({
      message: `Logged out from ${result.count} other device${result.count !== 1 ? 's' : ''}`,
      sessionsTerminated: result.count,
    })
  } catch (error) {
    console.error('Logout all error:', error)
    return NextResponse.json({ error: 'Failed to logout from other devices' }, { status: 500 })
  }
}
