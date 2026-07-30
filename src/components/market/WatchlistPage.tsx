'use client';

/**
 * Multi-watchlist page.
 *
 * Replaces the old single-list watchlist with a tabbed UI that supports any
 * number of named groups (default: "Stocks" and "Option Strikes").
 *
 * - Stock items link to /stock/<symbol>
 * - Option strike items link to /optionchain/strike?symbol=...&expiry=...&strike=...
 *
 * Data is stored in localStorage (see lib/multi-watchlist.ts). The legacy DB
 * watchlist at /api/watchlist is no longer used by this page.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatNumber, cn } from '@/lib/utils';
import {
  Search, Plus, Trash2, Star, X, ChevronDown, Pencil, Check, Layers, Clock,
} from 'lucide-react';
import { StockLogo } from '@/components/shared/StockLogo';
import {
  type WatchlistGroup, type WatchlistItem,
  listGroups, ensureDefaultGroups, createGroup, renameGroup, deleteGroup,
  addStockToGroup, addOptionStrikeToGroup, removeItemFromGroup,
  itemFingerprint, subscribe,
} from '@/lib/multi-watchlist';
import { getUpcomingExpiries, findExpiry, type ExpiryIndex } from '@/lib/expiry-calendar';
import { useLiveQuote } from '@/hooks/useLiveQuote';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { getUpstoxKey, INDEX_TO_UPSTOX_KEY } from '@/lib/upstox-instruments';

interface StockSearchHit {
  symbol: string;
  name: string;
}

const INDICES = [
  { symbol: 'NIFTY',     display: 'NIFTY 50'    },
  { symbol: 'SENSEX',    display: 'SENSEX'      },
  { symbol: 'BANKNIFTY', display: 'BANK NIFTY'  },
  { symbol: 'FINNIFTY',  display: 'FIN NIFTY'   },
] as const;

function formatExpiry(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function WatchlistPage() {
  const { user, token } = useAuthStore();
  const userId = user?.id ?? 'anon';

  const [groups, setGroups] = useState<WatchlistGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('stocks');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Stock search state (used inside the Stocks tab)
  const [stockQuery, setStockQuery] = useState('');
  const [stockHits, setStockHits] = useState<StockSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  // Option strike add form (used inside the Option Strikes tab)
  const [optSymbol, setOptSymbol] = useState<string>('NIFTY');
  const [optStrike, setOptStrike] = useState<string>('');
  const [optSide, setOptSide] = useState<'CE' | 'PE'>('CE');
  const [optExpiry, setOptExpiry] = useState<string>('');
  const [optError, setOptError] = useState<string | null>(null);
  const [optSuccess, setOptSuccess] = useState<string | null>(null);

  // Initial load + subscription to changes
  useEffect(() => {
    const refresh = () => {
      const next = ensureDefaultGroups(userId);
      setGroups(next);
      // Keep an active group selected — fall back to first group
      setActiveGroupId((prev) => {
        if (next.some((g) => g.id === prev)) return prev;
        return next[0]?.id ?? 'stocks';
      });
    };
    refresh();
    const unsub = subscribe(userId, refresh);
    return unsub;
  }, [userId]);

  // Stock search debounce
  useEffect(() => {
    if (!stockQuery || stockQuery.length < 2) {
      setStockHits([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(stockQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await res.json();
        if (!cancelled && j.success) setStockHits(j.data);
      } catch { /* ignore */ }
      if (!cancelled) setSearching(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [stockQuery, token]);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? groups[0] ?? null,
    [groups, activeGroupId],
  );

  /* ── Swipe gesture for watchlist group navigation ── */
  const groupIds = useMemo(() => groups.map(g => g.id), [groups]);
  const currentIdx = groupIds.indexOf(activeGroupId);
  const swipeRef = useSwipeGesture({
    onSwipeLeft: () => { if (currentIdx < groupIds.length - 1) setActiveGroupId(groupIds[currentIdx + 1]); },
    onSwipeRight: () => { if (currentIdx > 0) setActiveGroupId(groupIds[currentIdx - 1]); },
  });

  /* ---------- handlers ---------- */
  const handleAddStock = useCallback(
    (symbol: string, name: string) => {
      if (!activeGroup) return;
      const ok = addStockToGroup(userId, activeGroup.id, symbol, name);
      if (!ok) {
        // already present — flash a hint
        setOptError(`${symbol} is already in ${activeGroup.name}`);
        setTimeout(() => setOptError(null), 2500);
      }
      setStockQuery('');
      setStockHits([]);
    },
    [userId, activeGroup],
  );

  // Upcoming expiries for the option-strike add form
  const optExpiries = useMemo(() => {
    const idx: ExpiryIndex = (['NIFTY', 'SENSEX', 'BANKNIFTY', 'FINNIFTY'].includes(optSymbol)
      ? optSymbol
      : 'NIFTY') as ExpiryIndex;
    return getUpcomingExpiries(idx, 4);
  }, [optSymbol]);

  // Auto-pick first expiry when symbol changes
  useEffect(() => {
    if (optExpiries.length > 0) setOptExpiry(optExpiries[0].date);
  }, [optExpiries]);

  const handleAddStrike = useCallback(() => {
    setOptError(null);
    setOptSuccess(null);
    if (!activeGroup) return;
    const strikeNum = parseInt(optStrike, 10);
    if (!strikeNum || strikeNum < 50 || strikeNum > 200000) {
      setOptError('Enter a valid strike price (e.g. 24600)');
      return;
    }
    if (!optExpiry) {
      setOptError('Pick an expiry date');
      return;
    }
    const ok = addOptionStrikeToGroup(userId, activeGroup.id, optSymbol, strikeNum, optSide, optExpiry);
    if (!ok) {
      setOptError('Already in this watchlist');
      return;
    }
    setOptSuccess(`Added ${optSymbol} ${strikeNum} ${optSide} (${formatExpiry(optExpiry)}) to ${activeGroup.name}`);
    setOptStrike('');
    setTimeout(() => setOptSuccess(null), 2500);
  }, [userId, activeGroup, optSymbol, optStrike, optSide, optExpiry]);

  const handleCreateGroup = useCallback(() => {
    const name = newGroupName.trim();
    if (!name) return;
    const g = createGroup(userId, name);
    setActiveGroupId(g.id);
    setNewGroupName('');
    setCreatingGroup(false);
  }, [userId, newGroupName]);

  const handleRenameGroup = useCallback(
    (groupId: string) => {
      const name = renameValue.trim();
      if (!name) {
        setRenaming(null);
        return;
      }
      renameGroup(userId, groupId, name);
      setRenaming(null);
      setRenameValue('');
    },
    [userId, renameValue],
  );

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      if (groupId === 'stocks' || groupId === 'option-strikes') return;
      setDeleteConfirmId(groupId);
    },
    [userId],
  );

  const confirmDeleteGroup = useCallback(
    (groupId: string) => {
      deleteGroup(userId, groupId);
      setActiveGroupId('stocks');
      setDeleteConfirmId(null);
    },
    [userId],
  );

  const cancelDeleteGroup = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);


  return (
    <div className="space-y-4">
      {/* ============== HEADER ============== */}
      <div className="card-soft p-4">
        <div className="flex items-center gap-3">
          <div className="icon-tile bg-tint-blue shrink-0">
            <Star className="h-5 w-5 text-brand-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-lg font-bold text-text-primary">My Watchlists</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Organise stocks and option strikes into separate lists. Saved on this device.
            </p>
          </div>
          <button
            onClick={() => setCreatingGroup((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-primary/90 transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            New List
          </button>
        </div>

        {creatingGroup && (
          <div className="mt-3 flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') setCreatingGroup(false); }}
              placeholder="List name (e.g. Bank Stocks, NIFTY Weeklies…)"
              className="flex-1 bg-bg-surface-alt border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
            <button
              onClick={handleCreateGroup}
              className="rounded-md bg-profit-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-profit-green/90"
            >
              Create
            </button>
            <button
              onClick={() => { setCreatingGroup(false); setNewGroupName(''); }}
              className="rounded-md bg-bg-surface-alt px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-surface"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* ============== GROUP TABS ============== */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar">
        {groups.map((g) => {
          const isActive = g.id === activeGroupId;
          const isRenaming = renaming === g.id;
          const isDefault = g.id === 'stocks' || g.id === 'option-strikes';
          return (
            <div
              key={g.id}
              className={cn(
                'group relative flex items-center gap-1 border-b-2 -mb-px whitespace-nowrap transition-colors',
                isActive
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              {isRenaming ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameGroup(g.id);
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    onBlur={() => handleRenameGroup(g.id)}
                    className="bg-transparent border-b border-brand-primary/40 px-2 py-2 text-xs font-semibold text-text-primary focus:outline-none"
                  />
                  <Check className="h-3 w-3 text-profit-green" />
                </>
              ) : (
                <>
                  <button
                    onClick={() => setActiveGroupId(g.id)}
                    className="px-3 py-2 text-xs sm:text-sm font-semibold"
                  >
                    {g.name}
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface-alt px-1 text-[10px] font-bold text-text-secondary">
                      {g.items.length}
                    </span>
                  </button>
                  <button
                    onClick={() => { setRenaming(g.id); setRenameValue(g.name); }}
                    className="transition-opacity px-1 text-text-tertiary hover:text-brand-primary"
                    aria-label="Rename list"
                    title="Rename list"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  {!isDefault && (
                    <button
                      onClick={() => handleDeleteGroup(g.id)}
                      className="transition-opacity px-1 text-text-tertiary hover:text-loss-red"
                      aria-label="Delete list"
                      title="Delete list"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
              </>
              )}
            </div>
          );
        })}
      </div>

      {/* ============== DELETE CONFIRMATION POPUP ============== */}
      {deleteConfirmId && (() => {
        const groupToDelete = groups.find(g => g.id === deleteConfirmId);
        if (!groupToDelete) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="card-soft p-5 mx-4 max-w-sm w-full shadow-xl border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tint-red shrink-0">
                  <Trash2 className="h-5 w-5 text-loss-red" />
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-text-primary">Delete Watchlist</p>
                  <p className="text-xs text-text-secondary">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                Are you sure you want to delete <span className="font-semibold text-text-primary">&ldquo;{groupToDelete.name}&rdquo;</span>?
                {groupToDelete.items.length > 0 && (
                  <span className="text-loss-red font-medium"> This list has {groupToDelete.items.length} item{groupToDelete.items.length === 1 ? '' : 's'}.</span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={cancelDeleteGroup}
                  className="flex-1 rounded-lg bg-bg-surface-alt px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDeleteGroup(deleteConfirmId)}
                  className="flex-1 rounded-lg bg-loss-red px-3 py-2 text-xs font-semibold text-white hover:bg-loss-red/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============== SWIPABLE GROUP CONTENT ============== */}
      <div ref={swipeRef} className="min-h-[50vh]">
      {activeGroup && (
        <div className="space-y-4">
          {/* ---------- Stocks tab ---------- */}
          {activeGroup.id === 'stocks' && (
            <div className="card-soft p-4">
              <h3 className="font-heading text-sm font-semibold text-text-primary mb-2">
                Add Stock to &ldquo;{activeGroup.name}&rdquo;
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  value={stockQuery}
                  onChange={(e) => setStockQuery(e.target.value)}
                  placeholder="Search stocks to add…"
                  className="w-full pl-9 pr-3 py-2 bg-bg-surface-alt border border-border rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-3 w-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {stockHits.length > 0 && (
                <div className="mt-2 rounded-lg border border-border bg-bg-surface max-h-60 overflow-y-auto custom-scrollbar">
                  {stockHits.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => handleAddStock(s.symbol, s.name)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-bg-surface-alt transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <StockLogo symbol={s.symbol} size="sm" rounded="md" />
                        <div className="min-w-0">
                          <span className="font-mono font-semibold text-text-primary">{s.symbol}</span>
                          <span className="ml-2 text-xs text-text-secondary truncate">{s.name}</span>
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-brand-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {optError && <p className="mt-2 text-xs text-loss-red">{optError}</p>}
            </div>
          )}

          {/* ---------- Option strikes tab ---------- */}
          {activeGroup.id === 'option-strikes' && (
            <div className="card-soft p-4 space-y-3">
              <h3 className="font-heading text-sm font-semibold text-text-primary">
                Add Option Strike to &ldquo;{activeGroup.name}&rdquo;
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-medium uppercase text-text-tertiary">Index</label>
                  <select
                    value={optSymbol}
                    onChange={(e) => setOptSymbol(e.target.value)}
                    className="w-full bg-bg-surface-alt border border-border rounded-md px-2 py-1.5 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  >
                    {INDICES.map((i) => (
                      <option key={i.symbol} value={i.symbol}>{i.display}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase text-text-tertiary">Strike</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={optStrike}
                    onChange={(e) => setOptStrike(e.target.value)}
                    placeholder="e.g. 24600"
                    className="w-full bg-bg-surface-alt border border-border rounded-md px-2 py-1.5 text-xs font-mono font-semibold text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase text-text-tertiary">Side</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setOptSide('CE')}
                      className={cn(
                        'flex-1 rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors',
                        optSide === 'CE'
                          ? 'bg-profit-green text-white'
                          : 'bg-bg-surface-alt text-text-secondary hover:bg-bg-surface'
                      )}
                    >CE</button>
                    <button
                      onClick={() => setOptSide('PE')}
                      className={cn(
                        'flex-1 rounded-md px-2 py-1.5 text-[11px] font-bold transition-colors',
                        optSide === 'PE'
                          ? 'bg-loss-red text-white'
                          : 'bg-bg-surface-alt text-text-secondary hover:bg-bg-surface'
                      )}
                    >PE</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase text-text-tertiary">Expiry</label>
                  <select
                    value={optExpiry}
                    onChange={(e) => setOptExpiry(e.target.value)}
                    className="w-full bg-bg-surface-alt border border-border rounded-md px-2 py-1.5 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                  >
                    {optExpiries.map((e) => (
                      <option key={e.date} value={e.date}>
                        {formatExpiry(e.date)}{e.label ? ` · ${e.label}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleAddStrike}
                className="w-full rounded-lg bg-brand-primary py-2 text-sm font-semibold text-white hover:bg-brand-primary/90 transition-colors"
              >
                <Plus className="inline h-4 w-4 mr-1" />
                Add {optSymbol} {optStrike || '—'} {optSide}
              </button>
              {optError && <p className="text-xs text-loss-red">{optError}</p>}
              {optSuccess && <p className="text-xs text-profit-green">{optSuccess}</p>}
            </div>
          )}

          {/* ---------- Items list ---------- */}
          <div className="card-soft p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="font-heading text-sm font-semibold text-text-primary">
                {activeGroup.name} <span className="text-text-tertiary font-normal">· {activeGroup.items.length}</span>
              </h3>
              <LiveStatusBadge />
            </div>
            {activeGroup.items.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-surface-alt mb-2">
                  <Star className="h-6 w-6 text-text-secondary" />
                </div>
                <p className="text-sm font-medium text-text-primary">No items yet</p>
                <p className="text-xs text-text-secondary mt-1">
                  {activeGroup.id === 'stocks'
                    ? 'Search and add stocks above to start tracking them here.'
                    : 'Use the form above to add NIFTY / SENSEX / BANKNIFTY / FINNIFTY strikes.'}
                </p>
              </div>
            ) : (
              <WatchlistItems items={activeGroup.items} userId={userId} activeGroupId={activeGroup.id} />
            )}
          </div>
        </div>
      )}
      </div>{/* end swipable content */}
    </div>
  );
}

/* ---------- Live connection status pill ---------- */
function LiveStatusBadge() {
  const { status } = useLiveQuote();
  const isLive = status === 'upstox_connected' || status === 'open';
  const isPolling = status === 'polling';
  if (!isLive && !isPolling) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-tertiary">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-text-tertiary/40" />
        Connecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-profit-green">
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-profit-green animate-pulse" />
      {isLive ? 'LIVE' : 'LIVE'} · {isPolling ? 'polling' : 'ws'}
    </span>
  );
}

/* ---------- Items list with batched live subscription ---------- */
function WatchlistItems({
  items,
  userId,
  activeGroupId,
}: {
  items: WatchlistItem[];
  userId: string;
  activeGroupId: string;
}) {
  const { quotes, subscribe, unsubscribe } = useLiveQuote();
  const subscribedRef = useRef<Set<string>>(new Set());

  // Build the list of instrument keys we want to subscribe to:
  // - For STOCK items: getUpstoxKey(symbol)
  // - For OPTION_STRIKE items: build a deterministic synthetic key for the strike
  //   (NSE_FO|<symbol>YYMMDD<strike>CE/PE) — same format as the option-chain route.
  //   Plus the underlying index key so we can show the spot price too.
  const instrumentKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of items) {
      if (item.type === 'STOCK') {
        const k = getUpstoxKey(item.symbol);
        if (k) keys.add(k);
      } else {
        // Option strike — subscribe to underlying index + the CE/PE option
        const idxKey = INDEX_TO_UPSTOX_KEY[item.symbol];
        if (idxKey) keys.add(idxKey);
        const yymmdd = (item.expiry || '').replace(/-/g, '').slice(2);
        keys.add(`NSE_FO|${item.symbol}${yymmdd}${item.strike}${item.side}`);
      }
    }
    return Array.from(keys);
  }, [items]);

  useEffect(() => {
    if (instrumentKeys.length === 0) return;
    const newKeys = instrumentKeys.filter((k) => !subscribedRef.current.has(k));
    const staleKeys = Array.from(subscribedRef.current).filter((k) => !instrumentKeys.includes(k));
    if (newKeys.length > 0) {
      subscribe(newKeys);
      newKeys.forEach((k) => subscribedRef.current.add(k));
    }
    if (staleKeys.length > 0) {
      unsubscribe(staleKeys);
      staleKeys.forEach((k) => subscribedRef.current.delete(k));
    }
    return () => {
      // Don't unsubscribe on every re-render — only on unmount
    };
  }, [instrumentKeys, subscribe, unsubscribe]);

  useEffect(() => {
    return () => {
      if (subscribedRef.current.size > 0) {
        unsubscribe(Array.from(subscribedRef.current));
        subscribedRef.current.clear();
      }
    };
  }, [unsubscribe]);

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <WatchlistItemRow
          key={itemFingerprint(item)}
          item={item}
          quotes={quotes}
          onRemove={() => removeItemFromGroup(userId, activeGroupId, itemFingerprint(item))}
        />
      ))}
    </div>
  );
}

/* ---------- Single item row ---------- */

function WatchlistItemRow({
  item,
  quotes,
  onRemove,
}: {
  item: WatchlistItem;
  quotes: Record<string, any>;
  onRemove: () => void;
}) {
  if (item.type === 'STOCK') {
    const upstoxKey = getUpstoxKey(item.symbol);
    const tick = upstoxKey ? quotes[upstoxKey] : undefined;
    const ltp = tick?.ltp ?? 0;
    const changePct = tick?.changePct ?? 0;
    const isUp = (tick?.change ?? 0) >= 0;
    const isLive = !!tick?.timestamp && Date.now() - tick.timestamp < 30000;
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 hover:bg-bg-surface-alt/50 transition-colors">
        <a href={`/stock/${item.symbol}`} className="flex items-center gap-2.5 min-w-0 flex-1">
          <StockLogo symbol={item.symbol} size="md" rounded="md" />
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-text-primary truncate">{item.symbol}</p>
            {item.name && <p className="text-xs text-text-secondary truncate">{item.name}</p>}
          </div>
        </a>
        <div className="text-right shrink-0 mr-1">
          {ltp > 0 ? (
            <>
              <p className={cn(
                'font-mono text-sm font-bold tabular-nums',
                tick ? 'text-text-primary' : 'text-text-secondary'
              )}>
                ₹{formatNumber(ltp, 2)}
              </p>
              {tick && (
                <p className={cn(
                  'font-mono text-[10px] tabular-nums font-semibold',
                  isUp ? 'text-profit-green' : 'text-loss-red'
                )}>
                  {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-text-tertiary">—</p>
          )}
          {isLive && (
            <span className="inline-flex h-1 w-1 rounded-full bg-profit-green animate-pulse mt-0.5" />
          )}
        </div>
        <button
          onClick={onRemove}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-loss-red/10 hover:text-loss-red transition-colors shrink-0"
          aria-label="Remove from watchlist"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Option strike row
  const href = `/optionchain/strike?symbol=${encodeURIComponent(item.symbol)}&expiry=${encodeURIComponent(item.expiry)}&strike=${item.strike}`;
  const idxInfo = INDICES.find((i) => i.symbol === item.symbol);
  const expEntry = findExpiry(item.symbol as ExpiryIndex, item.expiry);
  const idxKey = INDEX_TO_UPSTOX_KEY[item.symbol];
  const idxTick = idxKey ? quotes[idxKey] : undefined;
  const yymmdd = (item.expiry || '').replace(/-/g, '').slice(2);
  const optKey = `NSE_FO|${item.symbol}${yymmdd}${item.strike}${item.side}`;
  const optTick = quotes[optKey];
  const ltp = optTick?.ltp ?? 0;
  const changePct = optTick?.changePct ?? 0;
  const isUp = (optTick?.change ?? 0) >= 0;
  const isLive = !!optTick?.timestamp && Date.now() - optTick.timestamp < 30000;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 hover:bg-bg-surface-alt/50 transition-colors">
      <a href={href} className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md text-white shrink-0',
          item.side === 'CE' ? 'bg-profit-green' : 'bg-loss-red'
        )}>
          <Layers className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-bold text-text-primary">
              {idxInfo?.display ?? item.symbol} {item.strike}
            </span>
            <span className={cn(
              'pill text-[9px] font-bold px-1.5 py-0',
              item.side === 'CE' ? 'bg-profit-green/15 text-profit-green' : 'bg-loss-red/15 text-loss-red'
            )}>
              {item.side}
            </span>
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatExpiry(item.expiry)}
            {expEntry?.label && <span className="text-text-tertiary">· {expEntry.label}</span>}
            {idxTick?.ltp && (
              <span className="ml-1 font-mono text-text-tertiary">
                · spot ₹{formatNumber(idxTick.ltp, 0)}
              </span>
            )}
          </p>
        </div>
      </a>
      <div className="text-right shrink-0 mr-1">
        {ltp > 0 ? (
          <>
            <p className={cn(
              'font-mono text-sm font-bold tabular-nums',
              optTick ? 'text-text-primary' : 'text-text-secondary'
            )}>
              ₹{formatNumber(ltp, 2)}
            </p>
            {optTick && (
              <p className={cn(
                'font-mono text-[10px] tabular-nums font-semibold',
                isUp ? 'text-profit-green' : 'text-loss-red'
              )}>
                {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
              </p>
            )}
          </>
        ) : (
          <p className="text-[11px] text-text-tertiary">—</p>
        )}
        {isLive && (
          <span className="inline-flex h-1 w-1 rounded-full bg-profit-green animate-pulse mt-0.5" />
        )}
      </div>
      <button
        onClick={onRemove}
        className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-loss-red/10 hover:text-loss-red transition-colors shrink-0"
        aria-label="Remove strike from watchlist"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
