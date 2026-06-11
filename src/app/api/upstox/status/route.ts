// ─── Upstox Connection Status ──────────────────────────────────────────────
// Returns current Upstox API connection status and data source info

import { NextResponse } from 'next/server'
import { isUpstoxConfigured, isUpstoxAuthenticated, getUpstoxProfile } from '@/lib/upstox-api'

export async function GET() {
  try {
    const configured = isUpstoxConfigured()
    const authenticated = await isUpstoxAuthenticated()

    let profile = null
    if (authenticated) {
      profile = await getUpstoxProfile()
    }

    // Check for stored token in DB
    let hasStoredToken = false
    try {
      const { db } = await import('@/lib/db')
      const storedToken = await db.platformSettings.findUnique({
        where: { key: 'upstox_access_token' },
      })
      hasStoredToken = !!storedToken?.value
    } catch {
      // DB not available
    }

    return NextResponse.json({
      success: true,
      data: {
        configured,
        authenticated: authenticated || hasStoredToken,
        hasEnvToken: authenticated,
        hasStoredToken,
        profile,
        endpoints: {
          postback: '/api/upstox/postback',
          webhook: '/api/upstox/webhook',
          auth: '/api/upstox/auth',
          callback: '/api/upstox/auth/callback',
        },
        postbackUrl: 'https://pepertect.vercel.app/api/upstox/postback',
        webhookUrl: 'https://pepertect.vercel.app/api/upstox/webhook',
      },
    })
  } catch (error) {
    console.error('[Upstox Status] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check Upstox status' },
      { status: 500 }
    )
  }
}
