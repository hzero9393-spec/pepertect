import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const indices = await db.index.findMany({
      where: { isEnabled: true },
      orderBy: { symbol: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: indices,
    })
  } catch (error) {
    console.error('[API /indices] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch indices' },
      { status: 500 }
    )
  }
}
