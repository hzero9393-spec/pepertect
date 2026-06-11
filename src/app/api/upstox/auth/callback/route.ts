// ─── Upstox OAuth2 Callback Route ──────────────────────────────────────────
// Handles the OAuth2 callback from Upstox and exchanges auth code for token

import { NextRequest, NextResponse } from 'next/server'
import { exchangeUpstoxAuthCode, isUpstoxConfigured } from '@/lib/upstox-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    if (error) {
      console.error('[Upstox Auth Callback] OAuth error:', error, searchParams.get('error_description'))
      return NextResponse.redirect(
        new URL('/?upstox_error=' + encodeURIComponent(searchParams.get('error_description') || error), request.url)
      )
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'No authorization code received from Upstox' },
        { status: 400 }
      )
    }

    if (!isUpstoxConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Upstox API credentials not configured' },
        { status: 400 }
      )
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://pepertect.vercel.app'}/api/upstox/auth/callback`

    const tokenResponse = await exchangeUpstoxAuthCode(code, redirectUri)

    if (tokenResponse?.data?.access_token) {
      // In production, store the access token securely
      // For now, we'll store it in environment variable or database
      console.log('[Upstox Auth] Successfully obtained access token')
      console.log('[Upstox Auth] Token expires in:', tokenResponse.data.expires_in, 'seconds')

      // Store token info (in production, use encrypted database storage)
      try {
        const { db } = await import('@/lib/db')

        // Store or update the Upstox token in platform settings
        await db.platformSettings.upsert({
          where: { key: 'upstox_access_token' },
          update: { value: tokenResponse.data.access_token },
          create: {
            key: 'upstox_access_token',
            value: tokenResponse.data.access_token,
            description: 'Upstox API OAuth2 access token',
          },
        })

        if (tokenResponse.data.refresh_token) {
          await db.platformSettings.upsert({
            where: { key: 'upstox_refresh_token' },
            update: { value: tokenResponse.data.refresh_token },
            create: {
              key: 'upstox_refresh_token',
              value: tokenResponse.data.refresh_token,
              description: 'Upstox API OAuth2 refresh token',
            },
          })
        }

        // Store token obtained timestamp
        await db.platformSettings.upsert({
          where: { key: 'upstox_token_obtained_at' },
          update: { value: new Date().toISOString() },
          create: {
            key: 'upstox_token_obtained_at',
            value: new Date().toISOString(),
            description: 'Timestamp when Upstox token was last obtained/refreshed',
          },
        })

        console.log('[Upstox Auth] Tokens stored in database')
      } catch (dbErr) {
        console.error('[Upstox Auth] Failed to store tokens in DB:', dbErr)
      }

      // Redirect to home with success indicator
      return NextResponse.redirect(
        new URL('/?upstox_connected=true', request.url)
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to obtain access token from Upstox' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Upstox Auth Callback] Error:', error)
    return NextResponse.redirect(
      new URL('/?upstox_error=' + encodeURIComponent('Authentication failed'), request.url)
    )
  }
}
