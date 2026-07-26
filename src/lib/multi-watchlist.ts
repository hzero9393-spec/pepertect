/**
 * Multi-watchlist — a lightweight localStorage-backed watchlist system.
 *
 * Why localStorage instead of DB?
 * - The current `Watchlist` Prisma model is keyed on `stockId` only — it has no
 *   fields for `optionType`, `strikePrice`, or `expiry`, which are essential for
 *   tracking option strikes. Adding those would require a Prisma migration on a
 *   production database, which is risky.
 * - Watchlists are inherently a personal convenience feature and the data is
 *   easy to re-create (the user just re-adds a strike if they switch devices).
 * - Using localStorage keeps the feature self-contained and shippable today.
 *
 * Each user (keyed by userId) can have any number of named "groups". Each group
 * contains items that are either a stock (symbol) or an option strike
 * (symbol + strike + side + expiry). The UI on /watchlist lets the user create,
 * rename, delete groups, and add/remove items.
 */

export type WatchlistItemType = 'STOCK' | 'OPTION_STRIKE';

export interface StockItem {
  type: 'STOCK';
  symbol: string;
  name?: string;
  addedAt: number; // epoch ms
}

export interface OptionStrikeItem {
  type: 'OPTION_STRIKE';
  symbol: string;       // NIFTY, SENSEX, BANKNIFTY, FINNIFTY
  strike: number;
  side: 'CE' | 'PE';
  expiry: string;       // YYYY-MM-DD
  addedAt: number;
}

export type WatchlistItem = StockItem | OptionStrikeItem;

export interface WatchlistGroup {
  id: string;
  name: string;
  items: WatchlistItem[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_PREFIX = 'pepertect:watchlists:';

function storageKey(userId: string): string {
  return STORAGE_PREFIX + userId;
}

function safeRead(userId: string): WatchlistGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchlistGroup[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g) => g && typeof g.id === 'string' && typeof g.name === 'string' && Array.isArray(g.items)
    );
  } catch {
    return [];
  }
}

function safeWrite(userId: string, groups: WatchlistGroup[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(groups));
    // Notify any subscribed components in the same tab.
    window.dispatchEvent(new CustomEvent('multi-watchlist:change', { detail: { userId } }));
  } catch {
    /* quota exceeded — ignore */
  }
}

export function listGroups(userId: string): WatchlistGroup[] {
  return safeRead(userId);
}

export function getGroup(userId: string, groupId: string): WatchlistGroup | null {
  return safeRead(userId).find((g) => g.id === groupId) ?? null;
}

/**
 * Ensures the user has at least the two default groups ("Stocks" and "Option
 * Strikes"). If they don't exist yet, they're created. Returns the full list.
 */
export function ensureDefaultGroups(userId: string): WatchlistGroup[] {
  const groups = safeRead(userId);
  let changed = false;
  if (!groups.some((g) => g.name === 'Stocks')) {
    groups.push({
      id: 'stocks',
      name: 'Stocks',
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    changed = true;
  }
  if (!groups.some((g) => g.name === 'Option Strikes')) {
    groups.push({
      id: 'option-strikes',
      name: 'Option Strikes',
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    changed = true;
  }
  if (changed) safeWrite(userId, groups);
  return groups;
}

export function createGroup(userId: string, name: string): WatchlistGroup {
  const groups = safeRead(userId);
  const newGroup: WatchlistGroup = {
    id: 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    name: name.trim() || 'New List',
    items: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  groups.push(newGroup);
  safeWrite(userId, groups);
  return newGroup;
}

export function renameGroup(userId: string, groupId: string, newName: string): void {
  const groups = safeRead(userId);
  const g = groups.find((x) => x.id === groupId);
  if (!g) return;
  g.name = newName.trim() || g.name;
  g.updatedAt = Date.now();
  safeWrite(userId, groups);
}

export function deleteGroup(userId: string, groupId: string): void {
  // Don't allow deleting the two default groups — they're the user's "inbox".
  if (groupId === 'stocks' || groupId === 'option-strikes') return;
  const groups = safeRead(userId).filter((g) => g.id !== groupId);
  safeWrite(userId, groups);
}

/** Add a stock to a group. Returns true if added, false if it was already there. */
export function addStockToGroup(
  userId: string,
  groupId: string,
  symbol: string,
  name?: string,
): boolean {
  const groups = safeRead(userId);
  const g = groups.find((x) => x.id === groupId);
  if (!g) return false;
  const sym = symbol.toUpperCase();
  const exists = g.items.some(
    (i) => i.type === 'STOCK' && i.symbol === sym,
  );
  if (exists) return false;
  g.items.push({ type: 'STOCK', symbol: sym, name, addedAt: Date.now() });
  g.updatedAt = Date.now();
  safeWrite(userId, groups);
  return true;
}

/** Add an option strike to a group. Returns true if added, false if duplicate. */
export function addOptionStrikeToGroup(
  userId: string,
  groupId: string,
  symbol: string,
  strike: number,
  side: 'CE' | 'PE',
  expiry: string,
): boolean {
  const groups = safeRead(userId);
  const g = groups.find((x) => x.id === groupId);
  if (!g) return false;
  const sym = symbol.toUpperCase();
  const exists = g.items.some(
    (i) =>
      i.type === 'OPTION_STRIKE' &&
      i.symbol === sym &&
      i.strike === strike &&
      i.side === side &&
      i.expiry === expiry,
  );
  if (exists) return false;
  g.items.push({
    type: 'OPTION_STRIKE',
    symbol: sym,
    strike,
    side,
    expiry,
    addedAt: Date.now(),
  });
  g.updatedAt = Date.now();
  safeWrite(userId, groups);
  return true;
}

export function removeItemFromGroup(
  userId: string,
  groupId: string,
  itemId: string,
): void {
  // itemId is a stringified fingerprint of the item — see helper below.
  const groups = safeRead(userId);
  const g = groups.find((x) => x.id === groupId);
  if (!g) return;
  g.items = g.items.filter((i) => itemFingerprint(i) !== itemId);
  g.updatedAt = Date.now();
  safeWrite(userId, groups);
}

export function itemFingerprint(item: WatchlistItem): string {
  if (item.type === 'STOCK') return `S:${item.symbol}`;
  return `O:${item.symbol}:${item.strike}:${item.side}:${item.expiry}`;
}

/** Subscribe to changes — useful for cross-component reactivity. */
export function subscribe(userId: string, cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { userId?: string } | undefined;
    if (!detail || detail.userId === userId) cb();
  };
  window.addEventListener('multi-watchlist:change', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('multi-watchlist:change', handler);
    window.removeEventListener('storage', handler);
  };
}
