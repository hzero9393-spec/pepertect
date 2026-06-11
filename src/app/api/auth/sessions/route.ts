import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateRequest } from '@/lib/trade-auth'
import { parseUserAgent, getDeviceDescription } from '@/lib/ua-parser'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request)
    if (auth.error) return auth.error
    const userId = auth.userId
    const currentToken = auth.token

    // Fetch all active (non-expired) sessions for the user
    const sessions = await db.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Format sessions for the frontend
    const formatted = sessions.map((session) => {
      const isCurrent = session.token === currentToken

      // Parse user-agent if browser/os fields are empty (backward compat)
      let parsedBrowser = session.browser
      let parsedOs = session.os
      let parsedDeviceType = session.deviceType

      if (!parsedBrowser || !parsedOs || !parsedDeviceType) {
        const parsed = parseUserAgent(session.device)
        parsedBrowser = parsedBrowser || parsed.browser
        parsedOs = parsedOs || parsed.os
        parsedDeviceType = parsedDeviceType || parsed.deviceType

        // Update session record with parsed data (fire and forget)
        db.session.update({
          where: { id: session.id },
          data: {
            browser: parsedBrowser,
            os: parsedOs,
            deviceType: parsedDeviceType,
          },
        }).catch(() => {})
      }

      return {
        id: session.id,
        token: session.token,
        browser: parsedBrowser || 'Unknown',
        os: parsedOs || 'Unknown',
        deviceType: parsedDeviceType || 'Desktop',
        location: session.location || null,
        ipAddress: session.ipAddress || null,
        device: getDeviceDescription({
          browser: parsedBrowser || 'Unknown',
          os: parsedOs || 'Unknown',
          deviceType: parsedDeviceType || 'Desktop',
        }),
        isCurrent,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      }
    })

    return NextResponse.json({ sessions: formatted })
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
