import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';

/**
 * Default notification preferences. Stored on User.notifSettings as JSON.
 * Frontend reads the same defaults to render the initial UI state.
 */
export const DEFAULT_NOTIF_PREFS = {
  trade_executions: true,
  order_updates: true,
  price_alerts: true,
  market_open: false,
  market_close: false,
  learning_updates: true,
  subscription_renewal: true,
  security_alerts: true,
  promotional: false,
  weekly_digest: true,
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

/**
 * GET /api/user/preferences
 * Returns: { language, notifications: {...}, twoFactorEnabled }
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: {
        language: true,
        notifSettings: true,
        twoFactorEnabled: true,
      },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const notifications = {
      ...DEFAULT_NOTIF_PREFS,
      ...((user.notifSettings as Record<string, boolean> | null) ?? {}),
    };

    return NextResponse.json({
      success: true,
      data: {
        language: user.language,
        notifications,
        twoFactorEnabled: user.twoFactorEnabled,
        supportedLanguages: SUPPORTED_LANGUAGES,
      },
    });
  } catch (error) {
    console.error('Fetch preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/preferences
 * Body: { language?: "en", notifications?: {...} }
 */
export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { language, notifications } = body;

    const data: { language?: string; notifSettings?: any } = {};

    if (language !== undefined) {
      if (typeof language !== 'string' || !SUPPORTED_LANGUAGES.some((l) => l.code === language)) {
        return NextResponse.json(
          { success: false, error: 'Unsupported language' },
          { status: 400 }
        );
      }
      data.language = language;
    }

    if (notifications !== undefined) {
      if (typeof notifications !== 'object' || notifications === null) {
        return NextResponse.json(
          { success: false, error: 'Notifications must be an object' },
          { status: 400 }
        );
      }
      // Merge with defaults so unknown keys don't get persisted.
      const merged = { ...DEFAULT_NOTIF_PREFS, ...notifications };
      data.notifSettings = merged;
    }

    const updated = await db.user.update({
      where: { id: auth.userId },
      data,
      select: { language: true, notifSettings: true },
    });

    await logActivity({
      userId: auth.userId,
      action: 'PREFERENCES_UPDATE',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      details: { updatedKeys: Object.keys(data) },
    });

    const result = {
      language: updated.language,
      notifications: {
        ...DEFAULT_NOTIF_PREFS,
        ...((updated.notifSettings as Record<string, boolean> | null) ?? {}),
      },
    };

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Preferences updated',
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
