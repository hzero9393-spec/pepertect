import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateToken } from '@/lib/auth'
import { parseUserAgent } from '@/lib/ua-parser'
import { getLocationFromIP } from '@/lib/geo-location'

// ─── GET: Existing server-side OAuth redirect flow (fallback) ──────────────────
export async function GET(request: NextRequest) {
  try {
    let googleClientId = process.env.GOOGLE_CLIENT_ID || ''
    try {
      const setting = await db.platformSettings.findUnique({
        where: { key: 'google_client_id' }
      })
      if (setting?.value) googleClientId = setting.value
    } catch {
      // DB not available, use env var
    }
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

// ─── POST: Google Identity Services (GIS) client-side sign-in flow ─────────────
// Only requires GOOGLE_CLIENT_ID — no client secret or redirect URI needed.
export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json()

    if (!credential) {
      return NextResponse.json({ error: 'Missing credential' }, { status: 400 })
    }

    let googleClientId = process.env.GOOGLE_CLIENT_ID || ''
    try {
      const setting = await db.platformSettings.findUnique({
        where: { key: 'google_client_id' }
      })
      if (setting?.value) googleClientId = setting.value
    } catch {
      // DB not available, use env var
    }

    // Verify the Google ID token using Google's tokeninfo endpoint
    const verifyResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    )

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.text()
      console.error('[Google GIS] Token verification failed:', errorData)
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 })
    }

    const googleUser = await verifyResponse.json()

    // Verify audience matches our client ID
    if (googleClientId && googleUser.aud !== googleClientId) {
      console.error('[Google GIS] Audience mismatch:', googleUser.aud, '!==', googleClientId)
      return NextResponse.json({ error: 'Token audience mismatch' }, { status: 401 })
    }

    // Extract user info from the verified token
    const sub = googleUser.sub as string          // Google ID
    const email = googleUser.email as string
    const name = (googleUser.name || googleUser.email?.split('@')[0] || 'User') as string
    const picture = (googleUser.picture || null) as string | null
    const emailVerified = (googleUser.email_verified === true || googleUser.email_verified === 'true') as boolean

    console.log('[Google GIS] Verified user:', email)

    // ─── Find or create user (same logic as callback/route.ts) ───────────────
    let user: any = null

    // Step 1: Try finding by OAuth provider + ID
    try {
      user = await db.user.findFirst({
        where: {
          oauthProvider: 'google',
          oauthId: sub,
        },
      })
      console.log('[Google GIS] findFirst by OAuth:', user ? 'FOUND' : 'NOT FOUND')
    } catch (e: any) {
      console.error('[Google GIS] findFirst OAuth failed:', e.message)
      // pgbouncer might fail with prepared statements, try raw query
      try {
        const rawResult = await db.$queryRaw`SELECT * FROM users WHERE "oauthProvider" = 'google' AND "oauthId" = ${sub} LIMIT 1`
        user = Array.isArray(rawResult) && rawResult.length > 0 ? rawResult[0] : null
        console.log('[Google GIS] Raw query fallback OAuth:', user ? 'FOUND' : 'NOT FOUND')
      } catch (rawE: any) {
        return NextResponse.json(
          { error: 'Database query failed', details: `OAuth lookup: ${rawE.message?.substring(0, 100)}` },
          { status: 500 }
        )
      }
    }

    // Step 2: If not found by OAuth, try by email
    if (!user) {
      try {
        user = await db.user.findUnique({
          where: { email },
        })
        console.log('[Google GIS] findUnique by email:', user ? 'FOUND' : 'NOT FOUND')
      } catch (e: any) {
        console.error('[Google GIS] findUnique email failed:', e.message)
        try {
          const rawResult = await db.$queryRaw`SELECT * FROM users WHERE email = ${email} LIMIT 1`
          user = Array.isArray(rawResult) && rawResult.length > 0 ? rawResult[0] : null
          console.log('[Google GIS] Raw query fallback email:', user ? 'FOUND' : 'NOT FOUND')
        } catch (rawE: any) {
          return NextResponse.json(
            { error: 'Database query failed', details: `Email lookup: ${rawE.message?.substring(0, 100)}` },
            { status: 500 }
          )
        }
      }
    }

    // Step 3: Create or update user
    if (user) {
      // Update existing user
      console.log('[Google GIS] Updating user:', user.id)
      try {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            oauthProvider: 'google',
            oauthId: sub,
            name,
            avatar: picture,
            isEmailVerified: emailVerified,
            lastLoginAt: new Date(),
          },
        })
      } catch (e: any) {
        console.error('[Google GIS] Update failed:', e.message)
        // Non-critical, continue with existing user data
      }
    } else {
      // Create new user
      console.log('[Google GIS] Creating new user for:', email)
      try {
        user = await db.user.create({
          data: {
            name,
            email,
            avatar: picture,
            oauthProvider: 'google',
            oauthId: sub,
            passwordHash: null,
            isEmailVerified: emailVerified,
            virtualBalance: 100000,
            role: 'USER',
            subscription: 'FREE',
          },
        })
        console.log('[Google GIS] New user created:', user.id)
      } catch (createErr: any) {
        console.error('[Google GIS] Create failed:', createErr.message)
        // Maybe email already exists with different case? Try raw insert
        try {
          const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
          const now = new Date().toISOString()
          await db.$executeRaw`INSERT INTO users (id, name, email, "oauthProvider", "oauthId", avatar, "isEmailVerified", "virtualBalance", role, subscription, "isActive", "totalTrades", "winRate", "totalPnl", "marginUsed", "isPhoneVerified", "createdAt", "updatedAt")
            VALUES (${id}, ${name}, ${email}, 'google', ${sub}, ${picture}, ${emailVerified}, 100000, 'USER', 'FREE', true, 0, 0, 0, 0, false, ${now}, ${now})`
          user = { id, email, role: 'USER', isActive: true }
          console.log('[Google GIS] Raw insert user created:', id)
        } catch (rawErr: any) {
          return NextResponse.json(
            { error: 'Failed to create user', details: `Create: ${rawErr.message?.substring(0, 150)}` },
            { status: 500 }
          )
        }
      }
    }

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 })
    }

    // ─── Generate JWT ─────────────────────────────────────────────────────────
    let token: string
    try {
      token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      })
    } catch (tokenErr: any) {
      return NextResponse.json(
        { error: 'Token generation failed', details: tokenErr.message?.substring(0, 100) },
        { status: 500 }
      )
    }

    // ─── Create session ───────────────────────────────────────────────────────
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const userAgent = request.headers.get('user-agent')?.substring(0, 255) || 'Google GIS'
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
      console.error('[Google GIS] Session create failed:', sessionErr.message)
      // Try raw insert as fallback
      try {
        const sessionId = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        const now = new Date().toISOString()
        await db.$executeRaw`INSERT INTO sessions (id, "userId", token, device, "ipAddress", location, "expiresAt", "createdAt", browser, os, "deviceType")
          VALUES (${sessionId}, ${user.id}, ${token}, ${userAgent}, ${ipAddress}, ${location}, ${expiresAt.toISOString()}, ${now}, ${parsedUA.browser}, ${parsedUA.os}, ${parsedUA.deviceType})`
        sessionCreated = true
      } catch (rawSessErr: any) {
        console.error('[Google GIS] Raw session insert also failed:', rawSessErr.message)
      }
    }

    if (!sessionCreated) {
      return NextResponse.json(
        { error: 'Could not create login session. Please try again.' },
        { status: 500 }
      )
    }

    console.log('[Google GIS] SUCCESS - returning user + token')

    // Return the same response format as the login endpoint
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        subscription: user.subscription,
        isEmailVerified: user.isEmailVerified,
        virtualBalance: user.virtualBalance,
      },
      token,
    })
  } catch (error: any) {
    const errorMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error('[Google GIS] FATAL:', errorMsg)
    return NextResponse.json(
      { error: 'Google sign-in failed', details: errorMsg.substring(0, 200) },
      { status: 500 }
    )
  }
}
