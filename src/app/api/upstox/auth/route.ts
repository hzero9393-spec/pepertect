// ─── Upstox OAuth2 Auth Route ──────────────────────────────────────────────
// Initiates the Upstox OAuth2 flow by redirecting to Upstox login page

import { NextRequest, NextResponse } from 'next/server'
import { getUpstoxAuthUrl, isUpstoxConfigured } from '@/lib/upstox-api'

export async function GET(request: NextRequest) {
  try {
    if (!isUpstoxConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Upstox API credentials not configured. Set UPSTOX_API_KEY and UPSTOX_API_SECRET env variables.' },
        { status: 400 }
      )
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://pepertect.vercel.app'}/api/upstox/auth/callback`
    const state = `upstox_${Date.now()}`

    const authUrl = getUpstoxAuthUrl(redirectUri, state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[Upstox Auth] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to initiate Upstox auth' },
      { status: 500 }
    )
  }
}
