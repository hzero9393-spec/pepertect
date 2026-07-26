# PROJECT_CONTEXT.md — PaperTrade App Reference

> **Last updated**: 2026-07-19
> **Purpose**: Single-read reference so future sessions never re-scan the full codebase.
> **Rule**: Read this + CHANGELOG.md first. Only open specific files listed here when needed.

---

## 1. Tech Stack Summary

| Library | Version | Role |
|---|---|---|
| Next.js | ^16.1.1 | App Router, React 19, `src/app/` |
| React | ^19.0.0 | UI framework |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | ^4 | Styling via `@theme inline` in globals.css (v4 syntax, no tailwind.config) |
| tw-animate-css | ^1.3.5 | CSS animation utilities |
| Framer Motion | ^12.23.2 | All animations (page transitions, hover, layout, spring physics) |
| Zustand | ^5.0.6 | Single global store (`useAppStore`) |
| TradingView Lightweight Charts | ^5.2.0 | Candlestick/line charts in stock detail |
| @tanstack/react-virtual | ^3.14.6 | Virtualized stock table rows |
| @tanstack/react-table | ^8.21.3 | Table utilities (installed, used via custom TradingTable) |
| @tanstack/react-query | ^5.82.0 | Installed but not yet used in app code |
| Lucide React | ^0.525.0 | **Sole icon set** — never mix with other icon libraries |
| class-variance-authority | ^0.7.1 | Button/badge variant definitions |
| clsx + tailwind-merge | ^2.1.1 / ^3.3.1 | `cn()` utility in `@/lib/utils.ts` |
| next-themes | ^0.4.6 | Dark/light theme toggling (class-based) |
| @dnd-kit/core + sortable | ^6.3.1 / ^10.0.0 | Drag-and-drop reordering in watchlist |
| @react-three/fiber + drei | ^9.6.1 / ^10.7.7 | 3D hero scene on dashboard (lazy loaded) |
| three | ^0.185.1 | 3D rendering for hero |
| Prisma | ^6.11.1 | DB client (scaffolded, minimal use — db.ts exists) |
| sonner | ^2.0.6 | Installed (shadcn dep), NOT used — app uses custom TradingToast |
| shadcn/ui | (many @radix-ui packages) | Installed as dependency tree; custom wrappers preferred |
| date-fns | ^4.1.0 | Date formatting utilities |
| uuid | ^11.1.0 | ID generation in order engine |
| zod | ^4.0.2 | Schema validation (installed, minimal use) |
| react-hook-form + @hookform/resolvers | ^7.60.0 / ^5.1.1 | Installed but not yet used in app code |
| xlsx | latest | Excel export for Reports page |
| jspdf + html2canvas | latest | PDF export for Reports page (light-themed) |

---

## 2. Folder Structure Map

```
src/
├── app/
│   ├── api/route.ts          — Stub API route (GET hello world)
│   ├── globals.css           — ALL design tokens (colors, type scale, glass, shadows, animations)
│   ├── layout.tsx            — Root layout: Geist + Inter + JetBrains Mono fonts, ThemeProvider, ToastContainer
│   └── page.tsx              — Main shell: PageRenderer (SPA-style routing), useMarketSimulation, Sidebar, TopBar, MobileBottomNav
├── components/
│   ├── dashboard/
│   │   ├── dashboard-page.tsx — Full dashboard: hero, indices, stat cards, watchlist, gainers/losers, news
│   │   ├── hero-scene.tsx     — 3D Three.js hero (lazy loaded, reduced-motion aware)
│   │   └── use-dashboard-data.ts — Dashboard data hook (greeting, indices, watchlist, gainers/losers, news)
│   ├── layout/
│   │   ├── sidebar.tsx        — Collapsible sidebar 224px→64px, active pill animation, Lucide icons, tooltip on collapse
│   │   ├── topbar.tsx         — Glass sticky topbar: search overlay, index ticker, balance, notifications, theme toggle
│   │   ├── mobile-nav.tsx     — Fixed bottom tab bar (5 items: Home, Stocks, Portfolio, Watchlist, Ranks)
│   │   └── theme-provider.tsx — Thin wrapper around next-themes ThemeProvider
│   ├── orders/
│   │   └── orders-page.tsx    — Orders page: tabs (All/Open/Filled/Cancelled), order cards, trade history, cancel/modify, filter
│   ├── stocks/
│   │   ├── stocks-page.tsx    — Stocks listing: table/card toggle, search, filter chips, sector dropdown, OrderDrawer integration
│   │   ├── stock-detail.tsx   — Stock detail view: TradingView chart, tabs (overview/fundamentals/news/financials), trade buttons
│   │   ├── stock-table.tsx    — Virtualized stock table with @tanstack/react-virtual
│   │   ├── stock-card-grid.tsx — Card grid view for stocks
│   │   ├── stock-search.tsx   — Inline stock search component
│   │   ├── filter-chips.tsx   — Category filter chips + sector dropdown
│   │   ├── use-stock-chart.ts — Hook wrapping TradingView Lightweight Charts (candlestick/line, timeframe switching)
│   │   └── use-stocks-data.ts — Hook: filter/sort/search/view-mode logic, mock fundamentals/financials generators
│   ├── watchlist/
│   │   ├── watchlist-page.tsx — Full watchlist: named watchlists, drag reorder, swipe-to-delete, select mode, price alerts, trade
│   │   └── alert-modal.tsx    — Price alert creation modal (above/below/percent_change)
│   ├── shared/                — Reusable design-system components
│   │   ├── animated-number.tsx — Spring-animated counter with Indian formatting
│   │   ├── glass-card.tsx     — Card with card-premium styling + optional 3D hover
│   │   ├── order-drawer.tsx   — Buy/Sell slide-up drawer with order form (MARKET/LIMIT/SL, MIS/CNC, qty, validation)
│   │   ├── placeholder-page.tsx — Stub page component for unbuilt sections
│   │   ├── price-flash.tsx    — Green/red flash on price change
│   │   ├── sparkline.tsx      — SVG mini chart with gradient fill
│   │   ├── skeletons.tsx      — Shimmer loading states (text, block, card, table row, stat, chart, page)
│   │   ├── stat-card.tsx      — Animated stat card with icon, value, change badge
│   │   ├── status-badge.tsx   — CVA badge with 15+ variants (profit/loss/gold/pending/etc.)
│   │   ├── trading-button.tsx — CVA button with 8 variants, 4 sizes, Framer whileTap
│   │   ├── trading-card.tsx   — Card with card-premium class, hover lift/3d/glow options
│   │   ├── trading-input.tsx  — Styled input with search variant, label, error, clear button
│   │   ├── trading-modal.tsx  — Animated modal (sm/md/lg/xl), ESC close, backdrop blur
│   │   ├── trading-table.tsx  — Sortable data table with skeleton loading, row click, sticky header
│   │   └── trading-toast.tsx  — Custom toast system (success/error/warning/info), auto-dismiss, progress bar
│   ├── option-chain/option-chain-page.tsx — STUB
│   ├── portfolio/portfolio-page.tsx     — STUB
│   ├── positions/positions-page.tsx     — STUB
│   ├── reports/reports-page.tsx         — STUB
│   ├── leaderboard/leaderboard-page.tsx — STUB
│   ├── learn/learn-page.tsx             — Full learn/academy page
│   ├── profile/profile-page.tsx         — Full profile/settings page
│   └── ui/                    — shadcn/ui primitives (accordion, alert, badge, button, dialog, drawer, etc.)
│       └── (40+ files, mostly unused directly — app uses custom shared/ wrappers)
├── hooks/
│   ├── use-mobile.ts         — Viewport width < 768px detection
│   └── use-toast.ts          — shadcn toast hook (NOT used — app has custom TradingToast)
├── lib/
│   ├── db.ts                 — Prisma singleton (minimal use)
│   ├── mock-data.ts          — 40 Indian stocks, holdings, positions, orders, trades, watchlists, alerts, leaderboard, news, user profile, sector allocation, index data, 12 learn articles, 4 continue-learning items, 4 quiz questions, 12 glossary terms
│   ├── store.ts              — Zustand store (useAppStore): ALL app state + order engine
│   ├── types.ts              — All TypeScript interfaces/types
│   └── utils.ts              — cn() utility (clsx + twMerge)
```

---

## 3. Types Reference (`src/lib/types.ts`)

| Type | Description | Key Fields |
|---|---|---|
| `NavSection` | Union type for all page routes | `'dashboard' \| 'stocks' \| 'option-chain' \| 'portfolio' \| 'positions' \| 'orders' \| 'reports' \| 'watchlist' \| 'leaderboard' \| 'learn' \| 'profile'` |
| `Stock` | Full stock data with OHLCV, sparkline, candlesticks | symbol, name, exchange, segment, lotSize, tickSize, price, change, changePercent, open/high/low/close/prevClose, volume, marketCap, pe, sector, sparkline, candlesticks |
| `CandlestickData` | Single OHLCV candle | time, open, high, low, close, volume |
| `Holding` | Portfolio holding | symbol, name, qty, avgPrice, currentPrice, investedValue, currentValue, pnl, pnlPercent, dayChange, dayChangePercent, sector, daySparkline |
| `Position` | Open F&O/intraday position | id, symbol, name, type(LONG/SHORT), productType, segment, exchange, qty, avgPrice, currentPrice, pnl, pnlPercent, marginUsed, leverage, openedAt, closedAt?, closedPnl?, closedPnlPercent? |
| `ClosedPosition` extends Position | Closed position record | closedAt, closedPnl, closedPnlPercent (required) |
| `OrderSide` | `'BUY' \| 'SELL'` | — |
| `OrderType` | `'MARKET' \| 'LIMIT' \| 'SL'` | — |
| `ProductType` | `'MIS' \| 'CNC'` | — |
| `OrderStatus` | `'PENDING' \| 'EXECUTED' \| 'CANCELLED' \| 'REJECTED'` | — |
| `Order` | Order record | id, symbol, name, exchange, segment, type, orderType, productType, qty, price, triggerPrice?, status, rejectReason?, timestamp, filledQty, avgFillPrice |
| `Trade` | Filled trade record | id, orderId, symbol, name, exchange, segment, type, productType, qty, price, totalValue, timestamp |
| `WatchlistItem` | Minimal watchlist entry | symbol, name, price, change, changePercent |
| `NamedWatchlist` | Named watchlist group | id, name, items (WatchlistItem[]) |
| `PriceAlert` | Price alert config | id, symbol, stockName, type(above/below/percent_change), targetValue, active |
| `LeaderboardEntry` | Leaderboard row | rank, name, avatar, returns, totalTrades, winRate, streak, prevRank, segment, timePeriod, isCurrentUser? |
| `OptionChainRow` | Single option chain row | strike, callOI/callOIChg/callVolume/callIV/callLTP/callBid/callAsk/callChgPct/callDelta/callGamma/callTheta/callVega, put equivalents, isATM, isITMCall, isITMPut |
| `LearnCategory` | Category filter union | `'All' | 'Basics' | 'Technical Analysis' | 'F&O' | 'Risk Management' | 'Fundamentals'` |
| `ContentDifficulty` | Content difficulty level | `'Beginner' | 'Intermediate' | 'Advanced'` |
| `ContentType` | Content media type | `'video' | 'article' | 'quiz'` |
| `LearnArticle` | Learning article | id, title, category(LearnCategory), description, readTime, progress, thumbnail, difficulty, contentType, author |
| `ContinueLearningItem` | In-progress learning item | id, title, progress, thumbnailGradient, category |
| `QuizQuestion` | Quiz question | id, question, options(string[]), correctIndex, explanation |
| `GlossaryTerm` | Glossary term | id, term, definition |
| `UserProfile` | User profile | name, email, phone, avatar, joinDate, badges, settings |
| `Badge` | Achievement badge | id, name, description, icon (Lucide icon name string), unlocked, unlockedDate? |
| `UserSettings` | User preferences | theme(dark/light/system), notifications, priceAlerts, orderConfirmations, dailyMarketSummary, leaderboardUpdates, twoFactorAuth |
| `NewsItem` | Market news item | id, title, source, time, category, sentiment |
| `ReportTrade` | Completed round-trip trade for reports | id, date, symbol, name, type(BUY/SELL), segment(EQ/F&O), productType, qty, buyPrice, sellPrice, realizedPnl, category(Short-term/Long-term) |
| `PlaceOrderRequest` (in store.ts) | Shape sent from drawer to store | symbol, side, orderType, productType, qty, price, triggerPrice? |
| `PlaceOrderResult` (in store.ts) | Result from placeOrder | success, orderId?, rejectReason?, executedPrice? |

---

## 4. Store Reference (`src/lib/store.ts`)

**File**: `src/lib/store.ts`
**Export name**: `useAppStore`
**Framework**: Zustand (v5, `create()`)

### State Fields

| Category | Fields |
|---|---|
| Navigation | `activeSection`, `sidebarCollapsed` |
| Market Data | `stocks[]`, `watchlist[]` |
| Watchlist Mgmt | `namedWatchlists[]`, `activeWatchlistId`, `priceAlerts[]`, `selectMode`, `selectedWatchlistItems[]` |
| Portfolio | `portfolioValue`, `dayPnL`, `dayPnLPercent`, `availableBalance`, `totalTrades` |
| Search | `searchOpen`, `searchQuery` |
| Stock Detail | `selectedStock` (symbol or null) |
| Trade Drawer | `tradeDrawerOpen`, `tradeDrawerStock`, `tradeDrawerSide` |
| Theme | `theme` ('dark' | 'light') |
| Order Engine | `orders[]`, `trades[]`, `holdings[]`, `positions[]`, `closedPositions[]`, `hasPlacedFirstOrder` |

### Actions (Functions)

| Function | Purpose |
|---|---|
| `setActiveSection(section)` | Navigate to a page |
| `toggleSidebar()` | Collapse/expand sidebar |
| `updateStockPrice(symbol, newPrice)` | Update a stock's price + recalc change |
| `createWatchlist(name)` | Add a new named watchlist |
| `renameWatchlist(id, name)` | Rename a watchlist |
| `deleteWatchlist(id)` | Remove a watchlist and its items |
| `setActiveWatchlist(id)` | Switch active watchlist tab |
| `addToNamedWatchlist(watchlistId, item)` | Add stock to a watchlist |
| `removeFromNamedWatchlist(watchlistId, symbol)` | Remove stock from a watchlist |
| `reorderNamedWatchlist(watchlistId, items)` | Reorder items via drag-and-drop |
| `moveToWatchlist(fromId, toId, symbols)` | Move items between watchlists |
| `addAlert(alert)` | Create a price alert |
| `removeAlert(id)` | Delete a price alert |
| `toggleSelectItem(symbol)` | Toggle item in multi-select mode |
| `setSelectMode(on)` | Enter/exit multi-select |
| `clearSelection()` | Deselect all items |
| `selectAllItems()` | Select all items in current watchlist |
| `setPortfolioValue(v)` | Update total portfolio value |
| `setDayPnL(v)` | Update daily P&L |
| `setDayPnLPercent(v)` | Update daily P&L percentage |
| `setSearchOpen(open)` | Toggle search overlay |
| `setSearchQuery(q)` | Update search text |
| `setSelectedStock(symbol)` | Open/close stock detail view |
| `openTradeDrawer(symbol, side)` | Open buy/sell drawer for a stock |
| `closeTradeDrawer()` | Close the trade drawer |
| `setTheme(t)` | Set dark/light theme |
| `placeOrder(req)` → `PlaceOrderResult` | Execute a new order (validates, updates holdings/positions/balance) |
| `cancelOrder(orderId)` | Cancel a PENDING order |
| `modifyOrder(orderId, updates)` → `string \| null` | Modify qty/price/triggerPrice of PENDING order |
| `processPendingOrders()` | Check PENDING LIMIT/SL orders against current prices, execute if triggered |
| `closePosition(positionId)` | Square off an open position, move to closedPositions, release margin |

---

## 5. Component Inventory (Shared/Reusable)

| Component | File | Purpose | Key Props |
|---|---|---|---|
| `TradingButton` | `shared/trading-button.tsx` | CVA button with 8 variants (default, primary, destructive, secondary, ghost, outline, link, gold, brand), 4 sizes | `variant`, `size`, `asChild` |
| `TradingCard` | `shared/trading-card.tsx` | Card with premium styling, optional hover lift/3d/glow | `hoverLift`, `hover3d`, `glowOnHover`, `glowColor` |
| `GlassCard` | `shared/glass-card.tsx` | Simpler card variant with optional 3D hover | `hover3d`, `onClick` |
| `TradingTable` | `shared/trading-table.tsx` | Sortable data table with skeleton loading, AnimatePresence rows | `columns`, `data`, `loading`, `skeletonRows`, `onRowClick`, `emptyMessage`, `stickyHeader`, `compact` |
| `TradingModal` | `shared/trading-modal.tsx` | Animated modal dialog with backdrop blur, ESC close | `open`, `onClose`, `title`, `description`, `size` (sm/md/lg/xl) |
| `OrderDrawer` | `shared/order-drawer.tsx` | Slide-up buy/sell order form with validation, confetti on first order | `open`, `onClose`, `symbol`, `side` |
| `StatusBadge` | `shared/status-badge.tsx` | CVA badge with 15+ semantic variants | `variant`, `dot` |
| `TradingInput` | `shared/trading-input.tsx` | Styled input with search variant, label, error, clear button | `variant` (default/search), `label`, `error`, `icon`, `onClear` |
| `TradingToastContainer` + `useToast()` | `shared/trading-toast.tsx` | Custom toast system (global singleton, not React context) | `toast({type, title, description, duration})`, `dismiss(id)` |
| `AnimatedNumber` | `shared/animated-number.tsx` | Spring-animated number counter | `value`, `prefix`, `suffix`, `decimals`, `formatIndian` |
| `Sparkline` | `shared/sparkline.tsx` | SVG mini chart with gradient fill | `data`, `width`, `height`, `color`, `gradient`, `strokeWidth` |
| `StatCard` | `shared/stat-card.tsx` | Stat card with icon, animated value, change badge | `title`, `value`, `change`, `changePercent`, `icon`, `prefix`, `suffix`, `decimals`, `formatIndian`, `delay`, `colorClass` |
| `PriceFlash` | `shared/price-flash.tsx` | Price display with green/red flash on change | `value`, `prevValue`, `decimals`, `prefix` |
| `PlaceholderPage` | `shared/placeholder-page.tsx` | Stub page for unbuilt sections | `title`, `description`, `icon` |
| `ShimmerText` | `shared/skeletons.tsx` | Single-line shimmer skeleton | `className`, `width` |
| `ShimmerBlock` | `shared/skeletons.tsx` | Multi-line shimmer skeleton | `className`, `lines` |
| `CardSkeleton` | `shared/skeletons.tsx` | Card-shaped shimmer | — |
| `TableRowSkeleton` | `shared/skeletons.tsx` | Table row shimmer | `cols` |
| `StatCardSkeleton` | `shared/skeletons.tsx` | Stat card shimmer | — |
| `ChartSkeleton` | `shared/skeletons.tsx` | Chart area shimmer | `className` |
| `PageSkeleton` | `shared/skeletons.tsx` | Full page loading skeleton | — |
| `Sidebar` | `layout/sidebar.tsx` | Collapsible nav sidebar (224px↔64px) | Uses store directly |
| `TopBar` | `layout/topbar.tsx` | Glass topbar with search, index ticker, balance, theme toggle | Uses store directly |
| `MobileBottomNav` | `layout/mobile-nav.tsx` | Fixed bottom tab bar (5 items) | Uses store directly |

---

## 6. Pages Built So Far

| Route | File | Description | Status |
|---|---|---|---|
| `/` (dashboard) | `components/dashboard/dashboard-page.tsx` | Hero greeting, 5 index cards, 4 stat cards, watchlist strip, gainers/losers, news feed, 3D hero scene | **Complete** |
| `/` (stocks) | `components/stocks/stocks-page.tsx` | 40 stocks, table/card views, virtualized list, search, filter chips, sector dropdown, stock detail overlay, trade drawer | **Complete** |
| `/` (stock detail) | `components/stocks/stock-detail.tsx` | TradingView chart (candlestick/line), timeframes, overview/fundamentals/news/financials tabs, buy/sell buttons | **Complete** |
| `/` (watchlist) | `components/watchlist/watchlist-page.tsx` | 3 named watchlists, drag reorder (dnd-kit), swipe-to-delete, select mode, move between lists, price alerts, trade | **Complete** |
| `/` (orders) | `components/orders/orders-page.tsx` | Orders list with tabs (All/Open/Filled/Cancelled), order cards, trade history, cancel/modify modal, status filter, search | **Complete** (with order engine) |
| `/` (option-chain) | `components/option-chain/option-chain-page.tsx` | Instrument selector (5 underlyings), live spot with 2s ticks + flash, expiry pills from expiryCalendar2026.ts (weekly/monthly, M badge), metrics strip (Max Pain/PCR/Total OI), three-column grid CALLS|STRIKE|PUTS (31 strikes, ATM highlight, ITM shading, LTP→drawer, Greeks toggle), mobile CE/PE toggle, shimmer loading | **Complete** |
| `/` (portfolio) | `components/portfolio/portfolio-page.tsx` | Donut chart (sector allocation, 220px, 28px stroke, animated sweep, hover scale+dim), stats card stack (Invested/Current/Overall P&L/Today P&L with AnimatedNumber), holdings table (8 cols, P&L dominant, day sparklines, column sort with arrow animation, Framer Motion layout), custom sort dropdown, search, empty state with CTA | **Complete** |
| `/` (positions) | `components/positions/positions-page.tsx` | Summary bar (4 metrics with live P&L flash), Open/Closed tabs with layoutId animation, Equity/F&O filter chips, table with P&L dominant column (16px, flex 1.8), LTP flash, Square Off button, confirmation modal with spring animation, row exit collapse animation, live price recalculation | **Complete** |
| `/` (reports) | `components/reports/reports-page.tsx` | Date range selector (Today/Week/Month/Custom with layoutId pill), 4 summary stat cards (Net P&L, Win Rate, Total Trades, Best Trade with AnimatedNumber), P&L bar chart (recharts, profit/loss bars, top-only radius, custom tooltip), trade statistics table (9 rows), segment-wise P&L breakdown (horizontal animated bars), trade history table (9 columns, sort, pagination), export PDF (light-themed via html2canvas+jsPDF) & Excel (xlsx), empty state with CTA, 22 mock trades | **Complete** |
| `/` (leaderboard) | `components/leaderboard/leaderboard-page.tsx` | Podium (top 3 with staggered bounce, gold/silver/bronze medals), current user highlight banner with pulse, 40-user ranked list with rank-change indicators, time+segment filters, auto-scroll to user, skeleton loading, "not enough data" fallback | **Complete** |
| `/` (learn) | `components/learn/learn-page.tsx` | Search + category chips, Continue Learning snap-scroll row (3 in-progress cards with progress bars), 12-article grid (Beginner/Intermediate/Advanced, video/article types, difficulty+duration badges, hover lift), Daily Quiz widget (4 questions, confetti on correct, shake on wrong, streak counter, explanation fade-in, 2x2 grid options), Glossary accordion (12 terms, height-expand, chevron rotation, single-open, search filter), skeleton loading, 200ms filter cross-fade | **Complete** |
| `/` (profile) | `components/profile/profile-page.tsx` | Profile header (avatar+edit badge, level pill, Edit Profile button), 4-stat row (trades/win rate/rank link/level SVG ring), 24-badge achievement grid (9 unlocked with Lucide icons + shine hover, 15 locked with grayscale + lock overlay, popover tooltips), virtual balance card with reset button, settings sections (Appearance: 3-way Light/Dark/System segmented toggle synced via next-themes, Notifications: 4 toggle switches with spring knobs, Account: password/language/2FA, Danger Zone: reset+logout with loss-tinted card), confirmation modals (spring+backdrop-blur), 200ms page fade-in | **Complete** |

> **Note**: This is a single-page app — all "routes" are managed by `activeSection` in Zustand, rendered via `PageRenderer` in `page.tsx`. No actual Next.js file-based routing for sub-pages.

---

## 7. Design Tokens Summary

**Location**: `src/app/globals.css`

### Token Categories

| Category | What's Defined |
|---|---|
| **Colors (dark)** | `--background: #0A0E17`, `--foreground: #F4F6FA`, `--card` (rgba glass), `--muted-foreground: #8B92A5`, `--tertiary: #565D6E`, `--accent/brand: #6366F1` (indigo), `--profit: #17C783`, `--loss: #FF5252`, `--gold: #FFB800`, `--surface` (rgba glass), `--surface-hover`, `--surface-active` |
| **Colors (light)** | Full light mode equivalents with `#F7F8FC` bg, `--profit: #059669`, `--loss: #DC2626`, `--gold: #D97706` (darker for WCAG AA on light bg) |
| **Borders (semantic)** | `--border` (0.05 dark / 0.06 light), `--border-subtle` (0.03/0.04 — row separators), `--border-elevated` (0.08/0.10 — modals, tooltips), `--border-strong` (0.12/0.15 — hover/focus), `--input` (0.06/0.08). Tailwind classes: `border-border`, `border-border-subtle`, `border-border-elevated`, `border-border-strong`, `border-input`. |
| **Overlay** | `--overlay`: rgba(0,0,0,0.6) dark / rgba(0,0,0,0.35) light. Tailwind class: `bg-overlay`. |
| **Typography** | 3 font families: Geist (headings), Inter (body), JetBrains Mono (numeric). Type scale: `.text-display` → `.text-h1` → `.text-h2` → `.text-body` → `.text-caption` → `.text-micro`. `.font-num` for tabular-nums. |
| **Radius** | Base `--radius: 0.625rem` (10px). Derived sm/md/lg/xl. |
| **Shadows** | Multi-layer system: `.card-shadow` (theme-aware), `.card-premium` (borders via var, theme-aware shadows). |
| **Glassmorphism** | `.glass` (uses `var(--card)` + `var(--border)` — theme-aware), `.surface-elevated` (uses `var(--popover)` + `var(--border-elevated)`). |
| **Theme transitions** | `.transitioning` class on `<html>` enables 0.3s ease transitions on background-color, color, border-color, box-shadow, fill, stroke. Toggle adds class, removes after 350ms. |
| **Flash prevention** | Inline `<script>` in layout.tsx `<head>` reads localStorage/system preference, sets dark/light class before CSS loads. |
| **Animations** | `price-flash-green/red` (600ms), `shimmer` (1.5s infinite), `tickerScroll` (30s linear), `countUp`. Reduced-motion respected. |
| **Utility classes** | `.glass`, `.card-premium`, `.card-shadow`, `.surface-elevated`, `.shimmer`, `.custom-scrollbar`, `.btn-primary-premium`, `.glow-profit/gold/brand`, `.divider-subtle`, `.ticker-scroll`, `.price-flash-green/red`, `.font-num` |
| **Color system rule** | NEVER use `rgba(255,255,255,0.XX)` directly. NEVER use `bg-[#hex]` for theme colors. ALWAYS use semantic token classes (`bg-surface`, `border-border`, `text-muted-foreground`, etc.). ZERO `dark:` Tailwind prefix needed — CSS variables handle both modes. |

---

## 8. Known Conventions

1. **Monospace for money**: All prices, percentages, and financial numbers use `.font-num` class (JetBrains Mono, tabular-nums). The `AnimatedNumber` and `PriceFlash` components apply it automatically.

2. **Indian number formatting**: Prices displayed with `toLocaleString('en-IN', { minimumFractionDigits: 2 })`. The `₹` symbol is used as prefix. `AnimatedNumber` has `formatIndian` prop for Indian lakh/crore grouping.

3. **Lucide only**: All icons come from `lucide-react`. Never use emoji or other icon sets in UI code. `strokeWidth={1.8}` default, `2.2` for active state.

4. **Framer Motion per-component**: Animations are imported and configured per component. No global animation config. Common patterns: `whileTap={{ scale: 0.97 }}`, spring `stiffness: 400, damping: 30`, page `variants` with opacity+y, `layoutId` for shared layout animations.

5. **Semantic border tokens**: Never use `border-gray-*` or `border-[rgba(255,255,255,0.XX)]` directly. Use the semantic border tokens: `border-border` (default), `border-border-subtle` (row separators), `border-border-elevated` (modals/tooltips), `border-border-strong` (hover/focus), `border-input` (form fields). These adapt automatically to dark/light mode via CSS variables.

6. **Design tokens via CSS variables**: All colors reference `--profit`, `--loss`, `--gold`, `--brand`, `--surface`, etc. Use Tailwind classes like `text-profit`, `bg-surface-hover` which map to these variables via `@theme inline`. NEVER hardcode hex or rgba values for theme colors — the CSS variable system handles both dark and light modes transparently. For overlays, use `bg-overlay`. For inline styles that need theme colors, use `var(--foreground)`, `var(--muted-foreground)`, etc.

7. **SPA routing via Zustand**: Navigation uses `activeSection` in the store, not Next.js file-based routing. `PageRenderer` in `page.tsx` switches components. `AnimatePresence mode="wait"` handles page transitions.

8. **Toast system**: Custom global toast via `useToast()` → `toast({type, title, description})`. NOT shadcn's sonner/toast. Toast container is in `layout.tsx`.

9. **Order execution**: `placeOrder()` in the store is synchronous — validates, updates holdings/positions/balance, creates trade records. `processPendingOrders()` is called every 1.5s market tick to check LIMIT/SL triggers.

10. **Mock data**: All data in `mock-data.ts`. 40 Indian stocks (Nifty 50 subset), 8 holdings, 4 positions, 6 orders, 3 trades, 3 named watchlists, 3 price alerts, 6 news items, 40 leaderboard entries, 12 learn articles, 4 continue-learning items, 4 quiz questions, 12 glossary terms, 24 achievement badges (9 unlocked, 15 locked), 1 user profile, sector allocation data.

11. **No actual API calls**: Everything is client-side with mock data. The `api/route.ts` is a stub.

12. **3D hero is lazy loaded**: `HeroScene` uses `lazy()` import and `<Suspense>`. It respects `prefers-reduced-motion`.

13. **Mobile-first responsive**: Mobile bottom nav at `<1024px`, sidebar at `>=1024px`. Topbar index ticker hidden on `<xl`. Ticker scroll marquee on mobile.

14. **Component naming**: Shared components are prefixed with `Trading` (TradingButton, TradingCard, etc.) except simpler ones (Sparkline, AnimatedNumber, etc.).

15. **File paths**: All source is under `src/`. Aliases: `@/` maps to `src/`.