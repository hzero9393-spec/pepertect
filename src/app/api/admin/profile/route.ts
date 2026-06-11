import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAdmin, getClientIp } from '@/lib/admin-auth'
import { hashPassword, verifyPassword } from '@/lib/auth'

// GET: Get admin profile
export async function GET(request: NextRequest) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error

    const admin = result.admin!

    // Get full admin details
    const fullAdmin = await db.admin.findUnique({
      where: { id: admin.id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!fullAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ admin: fullAdmin })
  } catch (error) {
    console.error('[Admin Profile API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Update admin profile or change password
export async function PUT(request: NextRequest) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error
    const admin = result.admin!

    const body = await request.json()
    const { name, email, currentPassword, newPassword } = body

    // If currentPassword and newPassword are provided, it's a password change
    if (currentPassword && newPassword) {
      const fullAdmin = await db.admin.findUnique({
        where: { id: admin.id },
        select: { passwordHash: true },
      })

      if (!fullAdmin) {
        return NextResponse.json(
          { error: 'Admin not found' },
          { status: 404 }
        )
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, fullAdmin.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      // Validate new password
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters' },
          { status: 400 }
        )
      }

      // Hash and update password
      const hashedPassword = await hashPassword(newPassword)
      await db.admin.update({
        where: { id: admin.id },
        data: { passwordHash: hashedPassword },
      })

      // Create activity log
      const ipAddress = getClientIp(request)
      await db.activityLog.create({
        data: {
          adminId: admin.id,
          action: 'PASSWORD_CHANGE',
          targetId: admin.id,
          details: JSON.stringify({ username: admin.username }),
          ipAddress,
        },
      })

      return NextResponse.json({
        message: 'Password changed successfully',
      })
    }

    // Otherwise it's a profile update
    const updateData: any = {}
    const changes: string[] = []

    const currentAdmin = await db.admin.findUnique({
      where: { id: admin.id },
      select: { name: true, email: true },
    })

    if (!currentAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    if (name !== undefined && name !== currentAdmin.name) {
      updateData.name = name
      changes.push(`name: ${currentAdmin.name} → ${name}`)
    }

    if (email !== undefined && email !== currentAdmin.email) {
      // Check if email is already taken
      const existingAdmin = await db.admin.findUnique({
        where: { email },
      })
      if (existingAdmin && existingAdmin.id !== admin.id) {
        return NextResponse.json(
          { error: 'Email is already in use' },
          { status: 400 }
        )
      }
      updateData.email = email
      changes.push(`email: ${currentAdmin.email} → ${email}`)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No changes provided' },
        { status: 400 }
      )
    }

    const updatedAdmin = await db.admin.update({
      where: { id: admin.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Create activity log
    if (changes.length > 0) {
      const ipAddress = getClientIp(request)
      await db.activityLog.create({
        data: {
          adminId: admin.id,
          action: 'PROFILE_UPDATE',
          targetId: admin.id,
          details: JSON.stringify({ changes }),
          ipAddress,
        },
      })
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      admin: updatedAdmin,
    })
  } catch (error) {
    console.error('[Admin Profile API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
