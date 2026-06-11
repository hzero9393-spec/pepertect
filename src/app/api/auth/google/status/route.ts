import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  // Check env var first
  const envClientId = process.env.GOOGLE_CLIENT_ID || ''

  // Also check database settings
  let dbClientId = ''
  try {
    const setting = await db.platformSettings.findUnique({
      where: { key: 'google_client_id' }
    })
    dbClientId = setting?.value || ''
  } catch {
    // Database not available, use env var only
  }

  // DB setting takes priority, then env var
  const clientId = dbClientId || envClientId
  const isConfigured = !!clientId

  return NextResponse.json({
    configured: isConfigured,
    // Only expose the client ID when configured (needed for GIS initialization)
    clientId: isConfigured ? clientId : '',
  })
}
