import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ underlying: string }> }
) {
  try {
    const { underlying } = await params
    const { searchParams } = new URL(request.url)
    const expiry = searchParams.get('expiry')

    const where: Record<string, unknown> = {
      underlying: underlying.toUpperCase(),
      isActive: true,
    }

    if (expiry) {
      where.expiryDate = new Date(expiry)
    }

    const futures = await db.future.findMany({
      where,
      orderBy: { expiryDate: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: futures,
    })
  } catch (error) {
    console.error('[API /futures] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch futures data' },
      { status: 500 }
    )
  }
}
