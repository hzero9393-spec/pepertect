// ─── Upstox Feed Token ──────────────────────────────────────────────
// Returns the current Upstox access token for the Render WS service
// to connect directly to Upstox WebSocket feed

import { NextResponse } from 'next/server'
import { ensureValidToken } from '@/lib/upstox-api'

export async function GET() {
  try {
    const token = await ensureValidToken()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No Upstox access token available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      token,
      expiresIn: '24h',
    })
  } catch (error) {
    console.error('[Upstox Feed Token] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get Upstox token' },
      { status: 500 }
    )
  }
}
