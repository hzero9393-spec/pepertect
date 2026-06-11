// ─── Upstox Notifier Webhook Endpoint ─────────────────────────────────────
// Upstox sends market data notifications and alerts to this endpoint
// including price alerts, market events, and real-time data updates.
//
// Register this URL in your Upstox Developer Console:
// https://pepertect.vercel.app/api/upstox/webhook

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle different webhook event types
    const eventType = body.event || body.type || 'unknown'

    console.log('[Upstox Webhook] Received event:', {
      event: eventType,
      timestamp: new Date().toISOString(),
    })

    switch (eventType) {
      case 'market_data':
        // Real-time market data update
        handleMarketDataUpdate(body)
        break

      case 'price_alert':
        // Price alert triggered
        handlePriceAlert(body)
        break

      case 'market_status':
        // Market open/close status change
        handleMarketStatus(body)
        break

      case 'order_update':
        // Order status update (alternative to postback)
        handleOrderUpdate(body)
        break

      case 'position_update':
        // Position update
        handlePositionUpdate(body)
        break

      default:
        console.log('[Upstox Webhook] Unknown event type:', eventType, body)
        // Store unknown events for debugging
        break
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'ok', received: true, event: eventType })
  } catch (error) {
    console.error('[Upstox Webhook] Error processing webhook:', error)

    // Still return 200 to prevent Upstox from retrying
    return NextResponse.json({ status: 'error', message: 'Processing failed' }, { status: 200 })
  }
}

// ─── Event Handlers ─────────────────────────────────────────────────────

function handleMarketDataUpdate(data: Record<string, unknown>) {
  console.log('[Upstox Webhook] Market data update:', {
    instrument: data.instrument_token || data.trading_symbol,
    ltp: data.ltp,
    change: data.change,
    volume: data.volume,
  })

  // In production:
  // 1. Update cached market data
  // 2. Push updates to connected clients via WebSocket
  // 3. Check price alerts
  // 4. Update portfolio valuations
}

function handlePriceAlert(data: Record<string, unknown>) {
  console.log('[Upstox Webhook] Price alert triggered:', {
    symbol: data.symbol || data.trading_symbol,
    target_price: data.target_price,
    current_price: data.current_price || data.ltp,
    condition: data.condition,
  })

  // In production:
  // 1. Find users with matching price alerts
  // 2. Send push notifications
  // 3. Mark alert as triggered in database
}

function handleMarketStatus(data: Record<string, unknown>) {
  console.log('[Upstox Webhook] Market status change:', {
    exchange: data.exchange,
    status: data.status,
    market: data.market,
  })

  // In production:
  // 1. Update market status cache
  // 2. Notify users of market open/close
  // 3. Trigger pre-market or post-market calculations
}

function handleOrderUpdate(data: Record<string, unknown>) {
  console.log('[Upstox Webhook] Order update:', {
    order_id: data.order_id,
    status: data.status,
    filled_quantity: data.filled_quantity,
  })

  // This is an alternative path to the postback URL
  // Handle similarly to the postback handler
}

function handlePositionUpdate(data: Record<string, unknown>) {
  console.log('[Upstox Webhook] Position update:', {
    symbol: data.symbol || data.trading_symbol,
    quantity: data.quantity,
    pnl: data.pnl,
  })

  // In production:
  // 1. Update position records
  // 2. Recalculate portfolio value
  // 3. Check for margin requirements
}

// Handle GET for verification
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: 'upstox-webhook',
    description: 'Upstox notifier webhook endpoint for market data and events',
    supportedMethods: ['POST'],
    supportedEvents: [
      'market_data',
      'price_alert',
      'market_status',
      'order_update',
      'position_update',
    ],
  })
}
