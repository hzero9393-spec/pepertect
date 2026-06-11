import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get current Google OAuth configuration status
export async function GET() {
  try {
    let clientId = process.env.GOOGLE_CLIENT_ID || ''

    try {
      const setting = await db.platformSettings.findUnique({
        where: { key: 'google_client_id' }
      })
      if (setting?.value) clientId = setting.value
    } catch {}

    return NextResponse.json({
      configured: !!clientId,
      clientId: clientId ? `${clientId.substring(0, 10)}...${clientId.slice(-4)}` : '', // Mask for security
      source: clientId ? (process.env.GOOGLE_CLIENT_ID === clientId ? 'env' : 'database') : 'none',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 })
  }
}

// POST - Set Google OAuth Client ID (admin only)
export async function POST(request: NextRequest) {
  try {
    const { clientId } = await request.json()

    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    // Basic validation - Google Client IDs end with .apps.googleusercontent.com
    if (!clientId.includes('.apps.googleusercontent.com')) {
      return NextResponse.json({
        error: 'Invalid Google Client ID format. It should end with .apps.googleusercontent.com'
      }, { status: 400 })
    }

    // Store in database
    await db.platformSettings.upsert({
      where: { key: 'google_client_id' },
      update: { value: clientId, description: 'Google OAuth 2.0 Client ID for Sign-In' },
      create: { key: 'google_client_id', value: clientId, description: 'Google OAuth 2.0 Client ID for Sign-In' },
    })

    return NextResponse.json({ success: true, message: 'Google Client ID configured successfully' })
  } catch (error) {
    console.error('[Settings] Failed to save Google Client ID:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

// DELETE - Remove Google OAuth Client ID
export async function DELETE() {
  try {
    await db.platformSettings.deleteMany({
      where: { key: 'google_client_id' }
    })
    return NextResponse.json({ success: true, message: 'Google Client ID removed' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove settings' }, { status: 500 })
  }
}
