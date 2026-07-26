import { db } from '@/lib/db';

interface LogActivityArgs {
  userId: string;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  details?: unknown;
}

/**
 * Append an entry to the user's ActivityLog. Failure-safe — does not throw.
 */
export async function logActivity({
  userId,
  action,
  ip = null,
  userAgent = null,
  details,
}: LogActivityArgs): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        userId,
        action,
        ip,
        userAgent,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (err) {
    // Activity logging should never break the calling request.
    console.error('[activity] log failed:', err);
  }
}
