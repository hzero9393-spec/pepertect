// ─── Upstox Token Refresh ──────────────────────────────────────────────
// Manually triggers a token refresh using the stored refresh token

import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const { refreshUpstoxAccessToken } = await import('@/lib/upstox-api')
    const result = await refreshUpstoxAccessToken()

    if (result.success) {
      return NextResponse.json({ success: true, message: 'Token refreshed successfully' })
    }

    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
  } catch (error) {
    console.error('[Upstox Refresh] Error:', error)
    return NextResponse.json({ success: false, error: 'Token refresh failed' }, { status: 500 })
  }
}
