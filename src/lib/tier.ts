// Tier feature gating — used both server and client side
type Tier = 'FREE' | 'PREMIUM';

const FEATURE_MATRIX: Record<string, Tier> = {
  equity_trading: 'FREE',
  futures_trading: 'PREMIUM',
  options_trading: 'PREMIUM',
  realtime_prices: 'PREMIUM',
  // Option chain is available to everyone — paper trading platform,
  // and the user explicitly requested it for 4 indices across the app.
  option_chain: 'FREE',
  auto_exit: 'PREMIUM',
  advanced_reports: 'PREMIUM',
  unlimited_watchlist: 'PREMIUM',
  all_learning_modules: 'PREMIUM',
  trading_challenges: 'PREMIUM',
  market_breadth: 'PREMIUM',
  priority_support: 'PREMIUM',
};

export function hasFeature(userTier: Tier, featureKey: string): boolean {
  const requiredTier = FEATURE_MATRIX[featureKey];
  if (!requiredTier) return true; // Unknown features default to allowed
  const tierOrder = { FREE: 0, PREMIUM: 1 };
  return tierOrder[userTier] >= tierOrder[requiredTier as Tier];
}

export function getFeatureMatrix() {
  return FEATURE_MATRIX;
}

export const FREE_WATCHLIST_LIMIT = 10;
export const FREE_VIRTUAL_CAPITAL = 10000;
export const PREMIUM_VIRTUAL_CAPITAL = 100000;
export const PREMIUM_PRICE = 299;

/**
 * Returns the virtual capital for a given user tier.
 * FREE → ₹10,000 (paper trading starter)
 * PREMIUM → ₹1,00,000 (299 plan)
 */
export function getVirtualCapitalForTier(tier: string): number {
  return tier === 'PREMIUM' ? PREMIUM_VIRTUAL_CAPITAL : FREE_VIRTUAL_CAPITAL;
}
