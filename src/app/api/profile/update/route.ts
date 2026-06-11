import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId

    const body = await request.json()
    const { name, phone, avatar } = body

    // Validate
    if (!name && !phone && avatar === undefined) {
      return NextResponse.json(
        { error: 'At least one field (name, phone, or avatar) is required' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name) {
      if (name.length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
      }
      updateData.name = name
    }
    if (phone) {
      // Check phone uniqueness
      const existing = await db.user.findUnique({ where: { phone } })
      if (existing && existing.id !== userId) {
        return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 })
      }
      updateData.phone = phone
    }
    if (avatar !== undefined) {
      // avatar can be a base64 string or null (to remove)
      if (avatar !== null && typeof avatar === 'string') {
        // Validate it's a proper base64 image (max 2MB after base64 encoding)
        const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB
        if (avatar.length > MAX_AVATAR_SIZE * 1.37) { // base64 is ~37% larger
          return NextResponse.json({ error: 'Avatar image too large. Maximum size is 2MB.' }, { status: 400 })
        }
        if (!avatar.startsWith('data:image/')) {
          return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
        }
      }
      updateData.avatar = avatar
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    })

    const { passwordHash: _, twoFactorSecret: __, ...userWithoutSensitive } = user

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: userWithoutSensitive,
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
