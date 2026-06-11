import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
import { parseUserAgent } from '@/lib/ua-parser'
import { getLocationFromIP } from '@/lib/geo-location'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, password } = body

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    if (name.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Check phone if provided
    if (phone) {
      const existingPhone = await db.user.findUnique({ where: { phone } })
      if (existingPhone) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists' },
          { status: 409 }
        )
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user with ₹1,00,000 virtual balance
    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        virtualBalance: 100000,
        role: 'USER',
        subscription: 'FREE',
      },
    })

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

    // Return user data (without password)
    const { passwordHash: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: 'Account created successfully! Welcome to Pepertect! 🎉',
      user: userWithoutPassword,
      token,
    }, { status: 201 })
  } catch (error) {
    console.error('[Register API] Error:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Register API] Error details:', errorMsg)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
