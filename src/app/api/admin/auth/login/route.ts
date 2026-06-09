import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, generateToken } from '@/lib/auth'
import { getClientIp } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Auto-create default admin if no admin exists
    const adminCount = await db.admin.count()
    if (adminCount === 0) {
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin@123'
      const hashedPassword = await hashPassword(defaultPassword)
      await db.admin.create({
        data: {
          username: process.env.ADMIN_USERNAME || 'admin',
          passwordHash: hashedPassword,
          name: 'Admin',
          email: 'admin@pepertect.com',
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      })
    }

    // Find admin by username
    const admin = await db.admin.findUnique({
      where: { username },
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact super admin.' },
        { status: 403 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, admin.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // Generate JWT
    const token = generateToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
    })

    // Update lastLoginAt
    await db.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    // Create activity log
    const ipAddress = getClientIp(request)
    await db.activityLog.create({
      data: {
        adminId: admin.id,
        action: 'LOGIN',
        details: JSON.stringify({ username: admin.username }),
        ipAddress,
      },
    })

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error('[Admin Login API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
