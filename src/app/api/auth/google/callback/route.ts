import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateToken } from '@/lib/auth'
import { parseUserAgent } from '@/lib/ua-parser'
import { getLocationFromIP } from '@/lib/geo-location'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

function safeErrorRedirect(baseUrl: string, errorType: string, details?: string): NextResponse {
  const encodedDetails = details ? `&details=${encodeURIComponent(details.substring(0, 200))}` : ''
  console.error(`[Google OAuth] Error: ${errorType}`, details || '')
  return NextResponse.redirect(`${baseUrl}/?auth_error=${errorType}${encodedDetails}`)
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  return `${protocol}://${host}`
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request)

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${baseUrl}/?auth_error=google_denied`)
    }

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/?auth_error=no_code`)
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return safeErrorRedirect(baseUrl, 'google_not_configured',
        `CLIENT_ID=${GOOGLE_CLIENT_ID ? 'SET' : 'MISSING'}, CLIENT_SECRET=${GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING'}`)
    }

    // Exchange code for tokens
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`
    console.log('[Google OAuth] Exchanging code, redirect_uri:', redirectUri)

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      return safeErrorRedirect(baseUrl, 'token_exchange_failed', `Status ${tokenResponse.status}: ${errorData.substring(0, 150)}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('[Google OAuth] Token exchange OK')

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!userResponse.ok) {
      return safeErrorRedirect(baseUrl, 'user_info_failed', `Status ${userResponse.status}`)
    }

    const googleUser = await userResponse.json()
    console.log('[Google OAuth] Got user:', googleUser.email)

    // Find or create user - with full error handling for pgbouncer
    let user: any = null

    // Step 1: Try finding by OAuth provider + ID
    try {
      user = await db.user.findFirst({
        where: {
          oauthProvider: 'google',
          oauthId: googleUser.sub,
        },
      })
      console.log('[Google OAuth] findFirst by OAuth:', user ? 'FOUND' : 'NOT FOUND')
    } catch (e: any) {
      console.error('[Google OAuth] findFirst OAuth failed:', e.message)
      // pgbouncer might fail with prepared statements, try raw query
      try {
        const rawResult = await db.$queryRaw`SELECT * FROM users WHERE "oauthProvider" = 'google' AND "oauthId" = ${googleUser.sub} LIMIT 1`
        user = Array.isArray(rawResult) && rawResult.length > 0 ? rawResult[0] : null
        console.log('[Google OAuth] Raw query fallback OAuth:', user ? 'FOUND' : 'NOT FOUND')
      } catch (rawE: any) {
        return safeErrorRedirect(baseUrl, 'db_query_failed', `OAuth lookup: ${rawE.message?.substring(0, 100)}`)
      }
    }

    // Step 2: If not found by OAuth, try by email
    if (!user) {
      try {
        user = await db.user.findUnique({
          where: { email: googleUser.email },
        })
        console.log('[Google OAuth] findUnique by email:', user ? 'FOUND' : 'NOT FOUND')
      } catch (e: any) {
        console.error('[Google OAuth] findUnique email failed:', e.message)
        try {
          const rawResult = await db.$queryRaw`SELECT * FROM users WHERE email = ${googleUser.email} LIMIT 1`
          user = Array.isArray(rawResult) && rawResult.length > 0 ? rawResult[0] : null
          console.log('[Google OAuth] Raw query fallback email:', user ? 'FOUND' : 'NOT FOUND')
        } catch (rawE: any) {
          return safeErrorRedirect(baseUrl, 'db_query_failed', `Email lookup: ${rawE.message?.substring(0, 100)}`)
        }
      }
    }

    // Step 3: Create or update user
    if (user) {
      // Update existing user
      console.log('[Google OAuth] Updating user:', user.id)
      try {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: 'google',
            oauthId: googleUser.sub,
            name: googleUser.name,
            avatar: googleUser.picture,
            isEmailVerified: googleUser.email_verified,
            lastLoginAt: new Date(),
          },
        })
      } catch (e: any) {
        console.error('[Google OAuth] Update failed:', e.message)
        // Non-critical, continue with existing user data
      }
    } else {
      // Create new user
      console.log('[Google OAuth] Creating new user for:', googleUser.email)
      try {
        user = await db.user.create({
          data: {
            name: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.picture,
            oauthProvider: 'google',
            oauthId: googleUser.sub,
            passwordHash: null,
            isEmailVerified: googleUser.email_verified,
            virtualBalance: 100000,
            role: 'USER',
            subscription: 'FREE',
          },
        })
        console.log('[Google OAuth] New user created:', user.id)
      } catch (createErr: any) {
        console.error('[Google OAuth] Create failed:', createErr.message)
        // Maybe email already exists with different case? Try raw insert
        try {
          const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
          const now = new Date().toISOString()
          await db.$executeRaw`INSERT INTO users (id, name, email, "oauthProvider", "oauthId", avatar, "isEmailVerified", "virtualBalance", role, subscription, "isActive", "totalTrades", "winRate", "totalPnl", "marginUsed", "isPhoneVerified", "createdAt", "updatedAt")
            VALUES (${id}, ${googleUser.name}, ${googleUser.email}, 'google', ${googleUser.sub}, ${googleUser.picture}, ${googleUser.email_verified}, 100000, 'USER', 'FREE', true, 0, 0, 0, 0, false, ${now}, ${now})`
          user = { id, email: googleUser.email, role: 'USER', isActive: true }
          console.log('[Google OAuth] Raw insert user created:', id)
        } catch (rawErr: any) {
          return safeErrorRedirect(baseUrl, 'db_create_failed', `Create: ${rawErr.message?.substring(0, 150)}`)
        }
      }
    }

    if (!user || !user.isActive) {
      return safeErrorRedirect(baseUrl, 'account_deactivated', 'Account not active')
    }

    // Generate JWT
    let token: string
    try {
      token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
    } catch (tokenErr: any) {
      return safeErrorRedirect(baseUrl, 'token_generation_failed', tokenErr.message?.substring(0, 100))
    }

    // Create session
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const userAgent = request.headers.get('user-agent')?.substring(0, 255) || 'Google OAuth'
    const parsedUA = parseUserAgent(userAgent)
    const ipAddress = request.headers.get('x-forwarded-for') || null
    const location = await getLocationFromIP(ipAddress)

    let sessionCreated = false

    try {
      await db.session.create({
        data: {
          userId: user.id,
          token,
          device: userAgent,
          ipAddress,
          browser: parsedUA.browser,
          os: parsedUA.os,
          deviceType: parsedUA.deviceType,
          location,
          expiresAt,
        },
      })
      sessionCreated = true
    } catch (sessionErr: any) {
      console.error('[Google OAuth] Session create failed:', sessionErr.message)
      // Try raw insert as fallback
      try {
        const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        const now = new Date().toISOString()
        await db.$executeRaw`INSERT INTO sessions (id, "userId", token, device, "ipAddress", location, "expiresAt", "createdAt", browser, os, "deviceType")
          VALUES (${sessionId}, ${user.id}, ${token}, ${userAgent}, ${ipAddress}, ${location}, ${expiresAt.toISOString()}, ${now}, ${parsedUA.browser}, ${parsedUA.os}, ${parsedUA.deviceType})`
        sessionCreated = true
      } catch (rawSessErr: any) {
        console.error('[Google OAuth] Raw session insert also failed:', rawSessErr.message)
      }
    }

    if (!sessionCreated) {
      return safeErrorRedirect(baseUrl, 'session_create_failed', 'Could not create login session. Please try again.')
    }

    console.log('[Google OAuth] SUCCESS - redirecting with token')
    return NextResponse.redirect(`${baseUrl}/?auth_token=${token}`)
  } catch (error: any) {
    const errorMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error('[Google OAuth] FATAL:', errorMsg)
    return safeErrorRedirect(baseUrl, 'oauth_callback_failed', errorMsg.substring(0, 200))
  }
}
