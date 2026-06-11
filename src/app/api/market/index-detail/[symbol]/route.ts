import { NextResponse } from 'next/server'
import { fetchIndexDetailData } from '@/lib/upstox-api'

// Force dynamic - no caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()

    // Use comprehensive data fetcher (Upstox → Yahoo → Fallback)
    const indexData = await fetchIndexDetailData(symbolUpper)

    if (!indexData) {
      return NextResponse.json(
        { success: false, error: `Unknown index: ${symbol}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data: indexData })
  } catch (error) {
    console.error(`[API /market/index-detail] Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch index detail' },
      { status: 500 }
    )
  }
}
