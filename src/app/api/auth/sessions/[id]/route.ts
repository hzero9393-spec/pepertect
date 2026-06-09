import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId
    const currentToken = auth.token
    const { id: sessionId } = await params

    // Find the session
    const session = await db.session.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Ensure the session belongs to the current user
    if (session.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Don't allow logging out the current session through this endpoint
    if (session.token === currentToken) {
      return NextResponse.json(
        { error: 'Cannot logout current session. Use /api/auth/logout instead.' },
        { status: 400 }
      )
    }

    // Delete the session
    await db.session.delete({
      where: { id: sessionId },
    })

    return NextResponse.json({
      message: 'Device logged out successfully',
      sessionId,
    })
  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json(
      { error: 'Failed to logout device' },
      { status: 500 }
    )
  }
}
