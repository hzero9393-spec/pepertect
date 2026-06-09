import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { parseUserAgent } from '@/lib/ua-parser'
import { getLocationFromIP } from '@/lib/geo-location'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact support.' },
        { status: 403 }
      )
    }

    // Check if user signed up via OAuth (no password)
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'This account uses Google Sign-In. Please sign in with Google.' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Create session
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const userAgent = request.headers.get('user-agent')?.substring(0, 255) || 'Unknown'
    const parsedUA = parseUserAgent(userAgent)
    const ipAddress = request.headers.get('x-forwarded-for') || null
    const location = await getLocationFromIP(ipAddress)

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

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Return user data (without password)
    const { passwordHash: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Login successful! Welcome back! 🚀',
      user: userWithoutPassword,
      token,
    })
  } catch (error) {
    console.error('[Login API] Error:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Login API] Error details:', errorMsg)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
