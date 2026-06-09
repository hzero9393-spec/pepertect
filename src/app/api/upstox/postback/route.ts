// ─── Upstox Postback URL Handler ───────────────────────────────────────────
// Upstox sends order status updates (postbacks) to this endpoint
// whenever an order is placed, modified, cancelled, or executed.
//
// Register this URL in your Upstox Developer Console:
// https://pepertect.vercel.app/api/upstox/postback

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('[Upstox Postback] Received order update:', {
      order_id: body.order_id,
      status: body.status,
      trading_symbol: body.trading_symbol,
      transaction_type: body.transaction_type,
      quantity: body.quantity,
      price: body.price,
      filled_quantity: body.filled_quantity,
      average_price: body.average_price,
      exchange: body.exchange,
      updated_at: body.updated_at,
    })

    // Verify postback is from Upstox (optional: check signature/IP)
    // In production, you should verify the postback authenticity

    // Process the order update
    // - Update order status in database
    // - Update position if order is filled
    // - Send notification to user
    // - Update portfolio if needed

    try {
      const { db } = await import('@/lib/db')

      // Find the order by Upstox order_id or exchange_order_id
      if (body.order_id) {
        // Log the postback for audit
        console.log(`[Upstox Postback] Order ${body.order_id} status: ${body.status}`)

        // If order is fully filled, update the trade
        if (body.status === 'complete' && body.filled_quantity > 0) {
          // The order has been executed
          // In a real trading system, you would:
          // 1. Update the Order record status
          // 2. Create/update a Trade record
          // 3. Update the Position
          // 4. Update user's virtual balance

          console.log(`[Upstox Postback] Order ${body.order_id} filled: ${body.filled_quantity} @ ${body.average_price}`)
        }

        // If order is cancelled or rejected
        if (body.status === 'cancelled' || body.status === 'rejected') {
          console.log(`[Upstox Postback] Order ${body.order_id} ${body.status}: ${body.status_message || 'No reason'}`)
        }
      }
    } catch (dbErr) {
      console.error('[Upstox Postback] Database update error:', dbErr)
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'ok', received: true })
  } catch (error) {
    console.error('[Upstox Postback] Error processing postback:', error)

    // Still return 200 to prevent Upstox from retrying
    return NextResponse.json({ status: 'error', message: 'Processing failed' }, { status: 200 })
  }
}

// Handle GET for verification
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: 'upstox-postback',
    description: 'Upstox order postback notification endpoint',
    supportedMethods: ['POST'],
  })
}
