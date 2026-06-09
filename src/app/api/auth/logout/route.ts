import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromHeaders } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request.headers)

    if (token) {
      // Delete the session
      await db.session.deleteMany({ where: { token } }).catch(() => {})
    }

    return NextResponse.json({
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
