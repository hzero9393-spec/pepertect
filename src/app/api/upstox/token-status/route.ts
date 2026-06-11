// ─── Upstox Token Health Status ──────────────────────────────────────────────
// Returns information about the Upstox access token health, expiry, and refresh status

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { isUpstoxConfigured } = await import('@/lib/upstox-api')

    const configured = isUpstoxConfigured()

    // Get token info from DB
    let accessToken = null
    let refreshToken = null
    let obtainedAt = null

    try {
      const { db } = await import('@/lib/db')
      accessToken = await db.platformSettings.findUnique({ where: { key: 'upstox_access_token' } })
      refreshToken = await db.platformSettings.findUnique({ where: { key: 'upstox_refresh_token' } })
      obtainedAt = await db.platformSettings.findUnique({ where: { key: 'upstox_token_obtained_at' } })
    } catch {
      // DB not available
    }

    let tokenAge = null
    let expiresIn = null
    let needsRefresh = false

    if (obtainedAt?.value) {
      const obtainedTime = new Date(obtainedAt.value).getTime()
      tokenAge = Date.now() - obtainedTime
      expiresIn = Math.max(0, 24 * 60 * 60 * 1000 - tokenAge)
      needsRefresh = tokenAge > 23 * 60 * 60 * 1000 // 23 hours
    }

    return NextResponse.json({
      success: true,
      data: {
        configured,
        hasAccessToken: !!(accessToken?.value || process.env.UPSTOX_ACCESS_TOKEN),
        hasRefreshToken: !!refreshToken?.value,
        tokenObtainedAt: obtainedAt?.value || null,
        tokenAgeMs: tokenAge,
        tokenAgeHours: tokenAge ? Math.round(tokenAge / 3600000 * 10) / 10 : null,
        expiresInMs: expiresIn,
        expiresHours: expiresIn ? Math.round(expiresIn / 3600000 * 10) / 10 : null,
        needsRefresh,
        willAutoRefresh: !!(refreshToken?.value && configured),
      }
    })
  } catch (error) {
    console.error('[Upstox Token Status] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to check token status' }, { status: 500 })
  }
}
