import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const banList = await db.fnOBanEntry.findMany({
      where: { isActive: true },
      orderBy: { banStartDate: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: banList,
    })
  } catch (error) {
    console.error('[API /options/ban-list] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch F&O ban list' },
      { status: 500 }
    )
  }
}
