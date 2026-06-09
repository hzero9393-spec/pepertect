import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || ''
    const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || ''

    if (!googleClientId) {
      // Get base URL from headers (works on Vercel)
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const baseUrl = `${protocol}://${host}`
      return NextResponse.redirect(`${baseUrl}/?auth_error=google_not_configured`)
    }

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: googleRedirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    })

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.redirect(googleAuthUrl)
  } catch (error) {
    console.error('[Google OAuth] Init error:', error)
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    return NextResponse.redirect(`${baseUrl}/?auth_error=google_oauth_failed`)
  }
}
