import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    const result = await authenticateAdmin(request)

    if (result.error) {
      return result.error
    }

    const admin = result.admin!

    return NextResponse.json({
      valid: true,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    })
  } catch (error) {
    console.error('[Admin Verify API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
