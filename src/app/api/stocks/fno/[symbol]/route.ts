import { NextRequest, NextResponse } from 'next/server'
import { fetchStockFnoData } from '@/lib/dhan-api'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const symbolUpper = symbol.toUpperCase()

    const fnoData = await fetchStockFnoData(symbolUpper)

    return NextResponse.json({
      success: true,
      data: fnoData,
    })
  } catch (error) {
    console.error(`[API /stocks/fno] Error:`, error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch F&O data' },
      { status: 500 }
    )
  }
}
