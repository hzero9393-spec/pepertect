/**
 * Notification System for Pepertect
 * 
 * Features:
 * - Create notifications with user preference check
 * - Support for multiple types: TRADE, SYSTEM, PRICE_ALERT, SUBSCRIPTION
 * - User can enable/disable notification types in preferences
 */

import { db } from '@/lib/db';

// Notification Types
export const NOTIFICATION_TYPES = {
  TRADE: 'TRADE',           // Order executed, SL hit, Target achieved
  SYSTEM: 'SYSTEM',         // Trial start/end, system messages
  PRICE_ALERT: 'PRICE_ALERT', // Price level reached
  SUBSCRIPTION: 'SUBSCRIPTION', // Payment, renewal
  MILESTONE: 'MILESTONE',   // Portfolio milestones
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Default notification preferences (all enabled)
const DEFAULT_PREFERENCES: Record<string, boolean> = {
  TRADE: true,
  SYSTEM: true,
  PRICE_ALERT: true,
  SUBSCRIPTION: true,
  MILESTONE: true,
};

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Get user's notification preferences
 * Returns default preferences if none set
 */
export async function getUserNotificationPreferences(userId: string): Promise<Record<string, boolean>> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { notifSettings: true },
    });

    if (user?.notifSettings) {
      const settings = typeof user.notifSettings === 'string' 
        ? JSON.parse(user.notifSettings) 
        : user.notifSettings;
      
      // Merge with defaults (in case new types added)
      return { ...DEFAULT_PREFERENCES, ...settings };
    }

    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user's notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string, 
  preferences: Partial<Record<string, boolean>>
): Promise<boolean> {
  try {
    const currentPrefs = await getUserNotificationPreferences(userId);
    const newPrefs = { ...currentPrefs, ...preferences };

    await db.user.update({
      where: { id: userId },
      data: { notifSettings: newPrefs as never },
    });

    return true;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
}

/**
 * Create a notification (respects user preferences)
 * 
 * @returns The created notification or null if user has disabled this type
 */
export async function createNotification(options: CreateNotificationOptions) {
  const { userId, type, title, message, data } = options;

  try {
    // Check user preferences
    const prefs = await getUserNotificationPreferences(userId);
    
    // If user has disabled this notification type, don't create it
    if (prefs[type] === false) {
      console.log(`[Notification] User ${userId} has disabled ${type} notifications. Skipping.`);
      return null;
    }

    const notification = await db.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });

    console.log(`[Notification] Created ${type} notification for user ${userId}: ${title}`);
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// ==================== PRE-BUILT NOTIFICATION HELPERS ====================

/**
 * Trade executed notification
 */
export async function notifyTradeExecuted(
  userId: string,
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  orderId?: string
) {
  return createNotification({
    userId,
    type: 'TRADE',
    title: side === 'BUY' ? '✅ Order Executed' : '💰 Position Closed',
    message: `${side === 'BUY' ? 'Bought' : 'Sold'} ${symbol} · ${quantity} qty @ ₹${price.toFixed(2)}`,
    data: { symbol, side, quantity, price, orderId },
  });
}

/**
 * Stop Loss Hit notification
 */
export async function notifyStopLossHit(
  userId: string,
  symbol: string,
  exitPrice: number,
  pnl: number,
  positionId?: string
) {
  const isLoss = pnl < 0;
  return createNotification({
    userId,
    type: 'TRADE',
    title: '⚠️ Stop Loss Hit!',
    message: `${symbol}: Squared off at ₹${exitPrice.toFixed(2)} · P&L ${isLoss ? '' : '+'}₹${pnl.toFixed(2)}`,
    data: { symbol, exitPrice, pnl, positionId, reason: 'SL_HIT' },
  });
}

/**
 * Target Achieved notification
 */
export async function notifyTargetAchieved(
  userId: string,
  symbol: string,
  exitPrice: number,
  pnl: number,
  positionId?: string
) {
  return createNotification({
    userId,
    type: 'TRADE',
    title: '🎯 Target Achieved!',
    message: `${symbol}: Squared off at ₹${exitPrice.toFixed(2)} · Profit +₹${pnl.toFixed(2)} 🎉`,
    data: { symbol, exitPrice, pnl, positionId, reason: 'TARGET_HIT' },
  });
}

/**
 * Stop Loss / Target Updated notification
 */
export async function notifySLTargetUpdated(
  userId: string,
  symbol: string,
  stopLoss?: number | null,
  target?: number | null,
  positionId?: string
) {
  const changes = [];
  if (stopLoss) changes.push(`SL: ₹${stopLoss.toFixed(2)}`);
  if (target) changes.push(`Target: ₹${target.toFixed(2)}`);

  return createNotification({
    userId,
    type: 'TRADE',
    title: '📊 Stop Loss / Target Updated',
    message: `${symbol}: ${changes.join(', ')}`,
    data: { symbol, stopLoss, target, positionId },
  });
}

/**
 * Trial Started notification
 */
export async function notifyTrialStarted(userId: string, days: number = 30) {
  return createNotification({
    userId,
    type: 'SUBSCRIPTION',
    title: '🎁 Premium Trial Activated!',
    message: `Enjoy ${days} days of FREE Premium access! Features unlocked.`,
    data: { trialDays: days },
  });
}

/**
* Trial Expiring Soon notification
*/
export async function notifyTrialExpiringSoon(userId: string, daysLeft: number) {
  return createNotification({
    userId,
    type: 'SUBSCRIPTION',
    title: '⏰ Trial Ending Soon',
    message: `Your free trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Upgrade to keep Premium features!`,
    data: { daysLeft },
  });
}

/**
 * Portfolio Milestone notification
 */
export async function notifyMilestone(
  userId: string,
  milestoneType: 'PNL_PROFIT' | 'TOTAL_TRADES' | 'WIN_STREAK',
  value: number | string
) {
  const titles = {
    PNL_PROFIT: '🏆 P&L Milestone!',
    TOTAL_TRADES: '📈 Trading Milestone!',
    WIN_STREAK: '🔥 Hot Streak!',
  };

  const messages = {
    PNL_PROFIT: `Congratulations! Your total P&L crossed ${typeof value === 'string' ? value : `+₹${value}`}`,
    TOTAL_TRADES: `Amazing! You've completed ${value} trades!`,
    WIN_STREAK: `Incredible! You're on a ${value}-trade win streak!`,
  };

  return createNotification({
    userId,
    type: 'MILESTONE',
    title: titles[milestoneType],
    message: messages[milestoneType],
    data: { milestoneType, value },
  });
}

/**
 * Welcome notification for new users
 */
export async function notifyWelcome(userId: string, name?: string) {
  return createNotification({
    userId,
    type: 'SYSTEM',
    title: `Welcome to Pepertect! 👋`,
    message: `Hi ${name || 'Trader'}! Start your paper trading journey. Virtual ₹1,00,000 ready to trade!`,
    data: { isNewUser: true },
  });
}
