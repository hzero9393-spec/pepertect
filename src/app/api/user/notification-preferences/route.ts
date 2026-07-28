import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrBypass } from '@/lib/dev-auth';
import { db } from '@/lib/db';
import { getUserNotificationPreferences, updateUserNotificationPreferences } from '@/lib/notifications';

/**
 * GET /api/user/notification-preferences
 * Get user's notification preferences
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const preferences = await getUserNotificationPreferences(auth.userId);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/notification-preferences
 * Update user's notification preferences
 */
export async function PUT(req: NextRequest) {
  const auth = await authenticateOrBypass(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    
    // Validate that we're only updating known preference keys
    const validKeys = ['TRADE', 'SYSTEM', 'PRICE_ALERT', 'SUBSCRIPTION', 'MILESTONE'];
    const updates: Record<string, boolean> = {};
    
    for (const [key, value] of Object.entries(body)) {
      if (validKeys.includes(key) && typeof value === 'boolean') {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid preferences to update' },
        { status: 400 }
      );
    }

    const success = await updateUserNotificationPreferences(auth.userId, updates);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    // Return updated preferences
    const updatedPrefs = await getUserNotificationPreferences(auth.userId);

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated',
      preferences: updatedPrefs,
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
