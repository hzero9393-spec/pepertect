// Tier feature gating — all features FREE (website is totally free)
type Tier = 'FREE' | 'PREMIUM';

// All features are available to everyone — website is 100% free
const FEATURE_MATRIX: Record<string, Tier> = {
  equity_trading: 'FREE',
  futures_trading: 'FREE',
  options_trading: 'FREE',
  realtime_prices: 'FREE',
  option_chain: 'FREE',
  auto_exit: 'FREE',
  advanced_reports: 'FREE',
  unlimited_watchlist: 'FREE',
  all_learning_modules: 'FREE',
  trading_challenges: 'FREE',
  market_breadth: 'FREE',
  priority_support: 'FREE',
};

export function hasFeature(userTier: Tier, featureKey: string): boolean {
  // All features are FREE — always return true
  return true;
}

export function getFeatureMatrix() {
  return FEATURE_MATRIX;
}

export const FREE_WATCHLIST_LIMIT = 9999; // Unlimited
export const FREE_VIRTUAL_CAPITAL = 100000; // ₹1 Lakh for all users
export const PREMIUM_VIRTUAL_CAPITAL = 100000; // Same as FREE (everything is free)
export const PREMIUM_PRICE = 0; // Free

/**
 * Returns the virtual capital for a given user tier.
 * All tiers get ₹1,00,000 — website is completely free.
 */
export function getVirtualCapitalForTier(tier: string): number {
  return 100000;
}
