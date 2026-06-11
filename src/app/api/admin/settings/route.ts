import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { authenticateAdmin, getClientIp } from '@/lib/admin-auth'

// Default settings
const DEFAULT_SETTINGS = [
  {
    key: 'subscription_price',
    value: '99',
    description: 'Monthly subscription price for premium plan (INR)',
  },
  {
    key: 'maintenance_mode',
    value: 'false',
    description: 'Enable maintenance mode to block user access',
  },
  {
    key: 'trading_enabled',
    value: 'true',
    description: 'Enable or disable trading functionality',
  },
  {
    key: 'max_virtual_balance',
    value: '1000000',
    description: 'Maximum virtual balance for users (INR)',
  },
]

// GET: Get all settings
export async function GET(request: NextRequest) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error

    // Ensure default settings exist
    for (const setting of DEFAULT_SETTINGS) {
      const existing = await db.platformSettings.findUnique({
        where: { key: setting.key },
      })
      if (!existing) {
        await db.platformSettings.create({
          data: setting,
        })
      }
    }

    const settings = await db.platformSettings.findMany({
      orderBy: { key: 'asc' },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[Admin Settings API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: Update settings
export async function PUT(request: NextRequest) {
  try {
    const result = await authenticateAdmin(request)
    if (result.error) return result.error
    const admin = result.admin!

    const body = await request.json()
    const { settings } = body as { settings: { key: string; value: string }[] }

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings array is required' },
        { status: 400 }
      )
    }

    const changes: string[] = []

    for (const setting of settings) {
      if (!setting.key || setting.value === undefined) {
        continue
      }

      const existing = await db.platformSettings.findUnique({
        where: { key: setting.key },
      })

      if (existing) {
        if (existing.value !== setting.value) {
          changes.push(`${setting.key}: ${existing.value} → ${setting.value}`)
          await db.platformSettings.update({
            where: { key: setting.key },
            data: { value: setting.value },
          })
        }
      } else {
        changes.push(`${setting.key}: created with value ${setting.value}`)
        await db.platformSettings.create({
          data: {
            key: setting.key,
            value: setting.value,
            description: `Setting: ${setting.key}`,
          },
        })
      }
    }

    // Create activity log
    if (changes.length > 0) {
      const ipAddress = getClientIp(request)
      await db.activityLog.create({
        data: {
          adminId: admin.id,
          action: 'UPDATE_SETTINGS',
          details: JSON.stringify({ changes }),
          ipAddress,
        },
      })
    }

    const updatedSettings = await db.platformSettings.findMany({
      orderBy: { key: 'asc' },
    })

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings: updatedSettings,
    })
  } catch (error) {
    console.error('[Admin Settings API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
