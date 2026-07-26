# Pepertect V4 — Complete UI/UX Replication Prompt

> **Purpose**: Use this prompt to give to any AI agent (Claude, GPT, Cursor, etc.) to recreate the exact same UI/UX design of Pepertect V4 — an Indian Stock Market Paper Trading Platform inspired by Groww's design language.

---

## 1. PROJECT OVERVIEW

Build a full-stack Indian stock market **paper trading platform** web application with the following characteristics:
- **Design Inspiration**: Groww (Indian fintech app) — clean, minimal, white surfaces with green accent
- **Type**: Single-page application with client-side routing (NOT file-based routing)
- **Framework**: Next.js 16 + React 19 + TypeScript
- **UI Library**: shadcn/ui (new-york style) with Radix UI primitives
- **Styling**: Tailwind CSS v4 (CSS-first config) + Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts + TradingView Lightweight Charts
- **State Management**: Zustand
- **Font Stack**: Geist Sans (UI text), Geist Mono (code), Inter (numbers/data with tabular-nums)

---

## 2. COMPLETE DESIGN TOKENS

### 2.1 Color Palette

```
Brand Primary:          #00D09C (mint green)
Brand Gradient:         linear-gradient(135deg, #00D09C 0%, #00A67E 100%)
Dimmed Primary:         #00b88a
Profit Green:           #00B386
Loss/Error Red:         #EB5B3C
Warning Amber:          #f59e0b
Success Green:          #22c55e
Info Blue:              #3b82f6

App Background:         #f5f7fa
Surface (white):        #ffffff
Surface Dim:            #f5f7fa
Surface Variant:        #f0f2f5
Surface Container Low:  #f8f9fb

Primary Text:           #1a1a1a (or #111827 for headings)
Secondary Text:         #6b7280
Muted Text:             #9ca3af
Extra Muted:            #b0b8c4

Border Default:         #e5e7eb
Border Subtle:          #e8ecf0
Border Faint:           #f0f0f0
Input Border:           #e5e7eb

--- Dark Theme (used on 4 pages only) ---
Dark Background:        #0a0e17
Dark Surface:           #111827
Dark Border:            #1f2937
Dark Alt Surface:       #1a2236 / #1e2a42
Dark Text:              #e8eaed
Dark Primary Accent:    #f59e0b (amber, replaces green)
```

### 2.2 Semantic Trading Colors

```
Profit text:            color: #00B386
Loss text:              color: #EB5B3C
Profit background:      rgba(0, 179, 134, 0.08)
Loss background:        rgba(235, 91, 60, 0.08)
Profit border:          rgba(0, 179, 134, 0.2)
Loss border:            rgba(235, 91, 60, 0.2)
Profit pill:            bg with green tint + green border
Loss pill:              bg with red tint + red border
```

### 2.3 Typography

```
Page Titles:            text-xl sm:text-2xl font-bold text-[#1a1a1a] tracking-tight
Section Headings:       text-xs font-semibold text-[#6b7280] uppercase tracking-wider
Labels:                 text-[10px] font-bold text-[#6b7280] uppercase tracking-wider
Body Text:              text-sm text-[#6b7280]
Data/Numbers:           font-mono font-tabular (tabular-nums, letter-spacing: -0.02em)
LTP Values:             18px, font-weight 600, tabular-nums
P&L Values:             14px, font-weight 600, tabular-nums
Small Labels:           text-[11px] or text-[12px]
Group Labels (sidebar): text-[10px] font-bold uppercase tracking-[0.12em] text-[#b0b8c4]
```

### 2.4 Spacing & Dimensions

```
Border Radius (base):   0.75rem (12px)
Card Radius:            rounded-xl (12px)
Modal Radius:           rounded-2xl (16px)
Button Radius:          rounded-lg (8px)
Input Radius:           rounded-lg (8px)
Badge Radius:           rounded-lg or rounded-full
Pill Radius:            rounded-full

Sidebar Width:          240px (desktop), 240px Sheet (mobile)
Topbar Height:          56px (h-14)
Ticker Height:          36px
Mobile Nav Height:      64px (h-16)
Total Top Offset:       92px (topbar 56px + ticker 36px)
Watchlist Sidebar:      280px width

Page Padding:           px-4 sm:px-6 lg:px-8
Page Vertical Spacing:  space-y-5 or space-y-6
Card Padding:           p-4 to p-6
Card Border:            border border-[#e5e7eb] shadow-sm
```

### 2.5 Shadows

```
Card Shadow:            shadow-sm
Card Hover:             shadow-md
Topbar/Nav Shadow:      none (just border-bottom)
Dropdown Shadow:        0 8px 32px rgba(0,0,0,0.08)
Modal Overlay:          bg-black/50 backdrop-blur-sm
Logo Glow:              0 2px 8px rgba(0, 208, 156, 0.25)
Green Button Shadow:    0 1px 2px rgba(0,208,156,0.2)
```

### 2.6 Custom CSS Classes

```css
/* Scrollbar */
.custom-scrollbar { width: 4px; track: transparent; thumb: #d1d5db; border-radius: 9999px; }
.sidebar-scrollbar { width: 3px; track: transparent; thumb: #e5e7eb; }

/* Data Display */
.font-mono-data { font-family: Inter; font-weight: 500; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.font-tabular { font-variant-numeric: tabular-nums; }
.price-transition { transition: color 0.3s ease; }
.ltp-value { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.pnl-value { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }

/* Profit/Loss */
.text-profit { color: #00B386; }
.text-loss { color: #EB5B3C; }
.bg-profit { background-color: rgba(0, 179, 134, 0.08); }
.bg-loss { background-color: rgba(235, 91, 60, 0.08); }
.border-profit { border-color: rgba(0, 179, 134, 0.2); }
.border-loss { border-color: rgba(235, 91, 60, 0.2); }
.pill-profit { background: rgba(0, 179, 134, 0.1); color: #00B386; border: 1px solid rgba(0, 179, 134, 0.2); padding: 2px 8px; border-radius: 20px; }
.pill-loss { background: rgba(235, 91, 60, 0.1); color: #EB5B3C; border: 1px solid rgba(235, 91, 60, 0.2); padding: 2px 8px; border-radius: 20px; }

/* Card Styles */
.groww-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; transition: all 0.2s; }
.groww-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: #d1d5db; }
.groww-btn-hover:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 208, 156, 0.3); }

/* Search */
.groww-search { background: #f0f2f5; border: none; }
.groww-search:focus { background: white; border: 1px solid #00D09C; box-shadow: 0 0 0 3px rgba(0, 208, 156, 0.15); }

/* Tabs */
.groww-tab-pill { background: #e5e7eb; border-radius: 12px; padding: 3px; }
.groww-tab-pill button { padding: 6px 12px; border-radius: 10px; transition: all 0.2s; }
.groww-tab-pill button.active { background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* Animations */
.animate-stagger > * { animation: fadeInSlide 0.4s ease forwards; opacity: 0; }
@keyframes fadeInSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.animate-live-pulse { animation: livePulse 2s ease-in-out infinite; }
@keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.animate-flash-green { animation: flashGreen 0.5s ease; }
.animate-flash-red { animation: flashRed 0.5s ease; }
@keyframes flashGreen { 0% { background-color: rgba(0, 179, 134, 0.15); } 100% { background-color: transparent; } }
@keyframes flashRed { 0% { background-color: rgba(235, 91, 60, 0.15); } 100% { background-color: transparent; } }

/* Swipe page transitions (mobile) */
.swipe-exit-left { animation: swipeExitLeft 160ms cubic-bezier(0.4,0,1,1) forwards; }
.swipe-enter-right { animation: swipeEnterRight 180ms cubic-bezier(0,0,0.2,1) forwards; }
/* (and reverse directions) — translate 28% + opacity 0.4 */

/* Position cards */
.position-card-stable { contain: layout style; }
.pnl-fill-profit { background: linear-gradient(90deg, rgba(0,179,134,0.05), rgba(0,179,134,0.12)); border-left: 3px solid #00B386; }
.pnl-fill-loss { background: linear-gradient(90deg, rgba(235,91,60,0.05), rgba(235,91,60,0.12)); border-left: 3px solid #EB5B3C; }
```

---

## 3. APP SHELL & LAYOUT ARCHITECTURE

### 3.1 Client-Side SPA Router

The app uses **Zustand store** for page routing (NOT Next.js file-based routing):
- `currentPage` state with 20+ page IDs
- `window.history.pushState` for URL sync
- URL patterns: `/`, `/stocks`, `/stock/[symbol]`, `/index/[symbol]`, `/positions`, `/orders`, `/portfolio`, `/reports`, `/watchlist`, `/futures`, `/option-chain`, `/analytics`, `/learning`, `/leaderboard`, `/challenges`, `/profile`, `/settings`, `/active-devices`, `/help-support`

### 3.2 Desktop Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│  TopBar (fixed, h-14, full-width, z-30, white, border-b)    │
├────────┬─────────────────────────────────────────┬───────────┤
│        │  IndexTicker (fixed, h-9, z-20)         │           │
│ Side-  ├─────────────────────────────────────────┤ Watchlist │
│ bar    │                                         │ Sidebar   │
│ 240px  │         Main Content Area               │  280px    │
│ fixed  │         (ml-[240px], mt-[92px])          │ optional  │
│ z-40   │         flex-1, pb-0                    │ toggle    │
│        │                                         │           │
│        │                                         │           │
├────────┴─────────────────────────────────────────┴───────────┤
│  Footer (only on profile, help, and footer pages)            │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Mobile Layout Structure

```
┌──────────────────────────────────┐
│  TopBar (h-14, simplified)       │
├──────────────────────────────────┤
│  IndexTicker (h-9)               │
├──────────────────────────────────┤
│                                  │
│       Main Content Area          │
│       (mt-[92px], pb-16)         │
│       Swipeable between 5 pages  │
│                                  │
│                                  │
├──────────────────────────────────┤
│  MobileNav (fixed, h-16, bottom) │
└──────────────────────────────────┘
- Sidebar opens as Sheet (left, w-[240px])
- Swipe navigation between: Dashboard ↔ Trading ↔ Watchlist ↔ Positions ↔ Orders
- Swipe threshold: 45px, velocity threshold: 0.3px/ms, rubber-band at edges (15%)
```

### 3.4 Loading Screen

- Centered on `#f5f7fa` background
- 14×14 (56px) rounded-2xl pulsing icon in `#00D09C`
- "Pepertect" bold heading
- 3 bouncing dots with staggered delays (0ms, 150ms, 300ms)

---

## 4. SIDEBAR NAVIGATION (Desktop)

### Dimensions & Position
- `w-[240px]`, `h-screen`, `fixed left-0`, `z-40`
- Background: `#ffffff`, border-right: `1px solid #e8ecf0`
- Custom 3px scrollbar

### Logo Area (top)
- 36px (size-9) rounded-xl icon with `linear-gradient(135deg, #00D09C 0%, #00A67E 100%)` + glow shadow
- TrendingUp icon 18px white inside
- "Pepertect" text: 15px bold `#111827`
- "PAPER TRADING" subtext: 9px semibold uppercase, tracking-widest, `#9ca3af`
- Separator: `border-bottom: 1px solid #e8ecf0`

### Navigation Groups

**Group: TRADE** (label: 10px, bold, uppercase, tracking-[0.12em], color #b0b8c4)
| Item | Icon | Notes |
|------|------|-------|
| Home | LayoutDashboard | — |
| Stocks | CandlestickChart | — |
| Watchlist | Star | — |
| Futures | TrendingUp | 🔒 PRO locked (opacity-60, amber Lock badge) |
| Option Chain | GitBranch | — |

**Group: MANAGE**
| Item | Icon | Notes |
|------|------|-------|
| Positions | Crosshair | — |
| Orders | FileText | — |
| Portfolio | Wallet | — |
| Reports | BarChart3 | — |

**Group: LEARN**
| Item | Icon | Notes |
|------|------|-------|
| Learn | GraduationCap | — |

**Group: PLAN**
| Item | Icon | Notes |
|------|------|-------|
| Pricing | Crown | Shows "UPGRADE" badge for FREE users |

### Nav Item Styling
- **Default**: 13px, font-medium, color `#4b5563`, hover bg `#f4f6f8`, rounded-xl, px-3, py-2.5
- **Active**: bg `linear-gradient(135deg, rgba(0,208,156,0.1) 0%, rgba(0,166,126,0.06) 100%)`, text `#00A67E`, font-semibold
- **Active indicator**: 3px wide bar, h-5, rounded-r-full, gradient `#00D09C → #00A67E`, absolute left-0
- **Icon container**: 32px (size-8) rounded-lg; active bg `#00D09C/10`, hover bg `#e8ecf0`; icon 16px
- **Locked items**: opacity-60, 8px bold amber badge with Lock icon
- **UPGRADE badge**: 8px bold, white text, gradient green bg

### Bottom Section
- Settings: same active style as nav items, shows avatar or Settings icon
- Sign Out: hover bg `red-50/80`, icon/text hover `#ef4444`
- Separator: `border-top: 1px solid #e8ecf0`

---

## 5. TOP BAR

### Dimensions & Position
- `fixed left-0 right-0 top-0 z-30`, `h-14` (56px)
- Background: `#ffffff`, border-bottom: `1px solid #e8ecf0`

### Layout (left to right, flex, items-center, px-4)
1. **Mobile menu button** (md:hidden): Ghost variant, 36px, rounded-xl, `#4b5563`
2. **Mobile logo** (md:hidden): 32px rounded-xl green icon + "Pepertect" bold 16px
3. **Desktop subtitle** (hidden md:flex): "Paper Trading Platform", 14px, `#9ca3af`
4. **Spacer** (flex-1)
5. **Search bar** (hidden md:flex, max-w-[260px]):
   - Search icon 14px `#9ca3af` at left-3
   - Input: h-9, bg `#f4f6f8`, text `#111827`, no border, rounded-[10px]
   - Focus: ring `#00D09C/30`, bg white
   - Placeholder: "Search stocks, indices..."
6. **Right section** (flex, gap-1.5):
   - **WebSocket status badge**: 10px bold, rounded-lg, px-2 py-1
     - Connected: `#00D09C` text + `#00D09C/8` bg, Zap icon + "LIVE"
     - Disconnected: `#9ca3af` text + `#f4f6f8` bg, WifiOff icon + "REST"
   - **Watchlist toggle** (hidden md:flex): 36px, rounded-xl; active: `#00D09C` text + `#00D09C/10` bg
   - **Notification bell**: 36px, rounded-xl, `#9ca3af`
   - **User dropdown**:
     - Trigger: rounded-xl, px-2.5 py-1.5, hover `#f4f6f8`; avatar 32px rounded-lg
     - Dropdown: w-56, white bg, `#e8ecf0` border, shadow `0 8px 32px rgba(0,0,0,0.08)`, rounded-xl
     - Label: name semibold 14px + "Paper Trading Account" 11px `#9ca3af`
     - Items (14px, py-2.5, `#4b5563`): Settings + Reports + Sign Out (red)

---

## 6. MARKET INDEX TICKER

### Position & Dimensions
- `fixed left-0 right-0 top-[56px] z-20 md:left-[220px]`
- Height: 36px, bg `#fafafa`, border-bottom `#f0f0f0`

### Contents
1. **Market status pill** (shrink-0, pr-3, border-right `#f0f0f0`):
   - Open: `rgba(0,208,156,0.08)` bg, `#00D09C` text + pinging green dot
   - Closed: `rgba(235,91,60,0.08)` bg, `#eb5b3c` text + static red dot
   - "LIVE" / "REST" indicator with Zap/WifiOff icon
2. **Index buttons** (horizontal scroll, no-scrollbar):
   - Order: BANKNIFTY, FINNIFTY, MIDCPNIFTY, NIFTY, SENSEX
   - Each: symbol 11px semibold `#4a4a4a`, price 12px semibold tabular `#1a1a1a`, change% 11px semibold tabular (green/red)
   - Hover: white bg, rounded-md, px-2.5 py-1
   - Clickable → navigates to index detail page

---

## 7. MOBILE BOTTOM NAVIGATION

### Position & Dimensions
- `fixed bottom-0 left-0 right-0 z-40`, `md:hidden`
- Height: 64px (h-16), bg `#ffffff`, border-top `1px solid #e8ecf0`
- Shadow: `0 -2px 12px rgba(0,0,0,0.04)`, safe-area-inset-bottom padding

### 5 Nav Items (equally spaced, min-width 56px each)

| Item | Icon | Active Color |
|------|------|-------------|
| Home | Home | `#00D09C` |
| Stocks | CandlestickChart | `#00D09C` |
| Watchlist | Star | `#00D09C` |
| Positions | Crosshair | `#00D09C` |
| Orders | FileText | `#00D09C` |

### Item Styling
- **Active**: bg `rgba(0, 208, 156, 0.08)`, icon container bg `rgba(0, 208, 156, 0.12)`, icon/text `#00D09C` / `#00A67E`, font-weight 700
- **Inactive**: transparent, `#9ca3af`, font-weight 500
- Icon: 18px in 28px (size-7) rounded-lg container
- Label: 10px, leading-tight

---

## 8. AUTH PAGE (Login / Register)

### Layout: Split-screen (desktop), Single panel (mobile)

**Left Panel** (desktop, 52% width):
- Background: `#ffffff`
- Decorative: Two radial gradients (`#00D09C`, 7%/5% opacity) + SVG grid pattern (48×48, 3% opacity)
- Content (z-10, px-16/xl:px-20):
  - Logo: 44px (size-11) rounded-xl, `#00D09C/10` bg, TrendingUp 24px `#00D09C` + "Pepertect" 22px bold
  - Tagline: "Master Indian Markets" (38px bold) + "Before You Invest" in `#00D09C` + description 17px `#6b7280`
  - **3 Feature cards** (staggered framer-motion animation):
    - "Live Market Data" (BarChart3), "Zero Risk Practice" (Shield), "F&O Trading" (Zap)
    - Each: gap-4, p-4, rounded-xl, bg `#f7f8fc`, border `#e8eaf0`; icon 40px rounded-full `#00D09C/10`; title 15px semibold, desc 13px
  - **Stats row** (3 items): "50+" NSE Stocks, "5" Indices, "₹1L" Virtual Cash
    - Each: flex-1, centered, py-4 px-3, rounded-xl, bg `#f7f8fc`, border `#e8eaf0`; value 22px bold `#00D09C`, label 12px `#9ca3af`

**Right Panel** (form area, flex-1):
- Background: `#f7f8fc`, centered, max-w-[420px], p-5/sm:p-8/lg:p-10
- **Login Form Card**: white, rounded-2xl, border `#e8eaf0`, shadow `0 1px 3px rgba(0,0,0,0.04)`, p-7/sm:p-8
- Title: "Welcome back" 22px bold + subtitle 14px `#6b7280`
- **Google button**: h-[46px], 14px, rounded-lg, white bg, `#374151` text, `#e0e0e0` border
- Divider: `#e8eaf0` lines + "or" 12px `#9ca3af`
- **Email input**: h-[46px], pl-10, bg `#f0f2f5`, border `#e8eaf0`, rounded-lg, 14px
  - Focus: border `#00D09C`, ring `#00D09C/15`, bg white
- **Password input**: Same + eye toggle + "Forgot password?" 12px `#00D09C`
- **Submit button**: h-[46px], 15px semibold, rounded-lg, bg `#00D09C`, white text
  - Shadow: `0 1px 2px rgba(0,208,156,0.2)`, hover `#00b88a`
- **Switch link**: 13px `#6b7280` + "Create Account" 13px semibold `#00D09C`

**Register Form** (additional):
- Name input (User icon), Phone optional
- **Password strength**: 4-segment bar (h-1, rounded-full); Weak/Fair=red, Good=amber, Strong=green
- Confirm password with red/green validation
- Terms checkbox with accent `#00D09C`

---

## 9. PAGE-BY-PAGE DETAILED SPECIFICATIONS

### 9.1 DASHBOARD PAGE

**Layout**: `min-h-screen bg-[#f5f7fa] px-4 sm:px-6 lg:px-8 py-6 space-y-6`

**Sections**:
1. **Market Status + Indices Row**: 
   - Market status badge (Open/Closed with color + pulse dot)
   - 5 Index cards in horizontal scroll: NIFTY, SENSEX, BANKNIFTY, FINNIFTY, MIDCPNIFTY
   - Each card: symbol name, large LTP (mono bold), change% with arrow icon, mini sparkline area
   - Clickable → opens Index Detail Drawer

2. **Top Gainers & Losers** (2-column grid):
   - Each: white card, rounded-xl, border `#e5e7eb`
   - Header: "Top Gainers" / "Top Losers" with TrendingUp/Down icon, count badge
   - 5 stock rows: StockLogo (sm) + symbol + LTP (mono) + change% pill
   - Row hover: bg `#f8f9fb`

3. **Sector Performance**:
   - White card, "Sector Performance" header
   - Grid of sector pills/bars: Banking, IT, Pharma, Auto, FMCG, Energy, Metal, Realty
   - Each: sector name + change% with colored bar (green/red, width proportional to %)
   - Sorted by performance

4. **Market Breadth**:
   - White card with Advancing/Declining/Unchanged counts
   - Visual bar showing proportion (green/gray/red segments)
   - Numbers in mono font

5. **Quick Actions** (if no positions):
   - CTA cards: "Start Trading", "Explore Option Chain", "View Watchlist"
   - Green accent, rounded-xl, hover lift effect

**Animations**: Framer Motion staggered entry (delay: index * 0.02, max 0.4), fade+slide from bottom

---

### 9.2 TRADING / STOCKS PAGE

**Layout**: `min-h-screen bg-[#f5f7fa]`
- Sticky header: `bg-white border-b border-[#e5e7eb] sticky top-0 z-30`
- Main: `grid grid-cols-1 lg:grid-cols-3 gap-6` (stock list 2/3 + order panel 1/3)

**Header**: "Stocks" title + LIVE badge + search input (debounce 300ms) + refresh button

**Market Stats Bar**: Advancing/Declining/Unchanged count badges

**Tab Filters** (horizontal scrollable pills):
- All, Nifty 50, Bank Nifty, F&O, Gainers (+N), Losers (N)
- Then sector pills with `w-px h-5 bg-[#e5e7eb]` divider
- Active pill: `bg-[#00D09C] text-white`; Inactive: `bg-white text-[#6b7280] border border-[#e5e7eb]`

**Stock List** (lg:col-span-2, max-height calc(100vh-280px), overflow-y-auto):
- Table header: `bg-[#f8f9fb]`, text-xs uppercase tracking-wider `#6b7280`
- **StockRow**: `flex items-center justify-between px-5 py-4 hover:bg-[#f8f9fb]`
  - Left: StockLogo (md) + symbol (bold) + F&O/F&O Ban badge + name
  - Right: Sector tag (hidden md:inline), LTP (mono bold), change pill, Star watchlist button
  - Border-bottom: `#f0f2f5`
- "Load More" button with spinner

**Order Panel** (lg:col-span-1, hidden lg:block, sticky top-[140px]):
- White card, `space-y-5`
- Stock info header with StockLogo (lg)
- **Buy/Sell toggle**: `flex rounded-xl bg-[#f5f7fa] p-1` with `bg-[#00d09c] text-white` / `bg-[#eb5b3c] text-white`
- **Order Type/Product selects**: `grid grid-cols-2 gap-3`, h-9 rounded-lg, focus ring `#00D09C/20`
- **Quantity**: Minus/Input/Plus row, h-9 w-9 buttons
- **SL/Target**: grid-cols-2 gap-2 with red/green labels
- **Order summary**: rounded-xl bg-[#f5f7fa] p-4
- **Submit**: full-width h-12 rounded-xl, `active:scale-[0.98]`
- **Account info**: Available balance + buying power

**Mobile Floating Bar**: `fixed bottom-16 left-0 right-0 z-40 lg:hidden` — Buy/Sell buttons, spring animation entry

---

### 9.3 STOCK OVERVIEW PAGE

**Layout**: `min-h-screen bg-[#f5f7fa]`, centered `max-w-4xl mx-auto space-y-6`

**Header**: Back button (ArrowLeft), StockLogo (lg), name, exchange badge, LIVE badge, Watchlist star, F&O badges, Buy/Sell buttons

**Tabs** (underline style, border-b-2): Overview | F&O (conditional) | Technicals | News

**Overview Tab**:
1. **Price Chart**: Recharts AreaChart, h-[300px] sm:h-[380px], gradient fill `#00D09C` → transparent
2. **Range selector**: 1D, 1W, 1M, 3M, 6M, 1Y pills
3. **Key Stats Grid**: `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3` — Open, High, Low, Close, Volume, 52W High, 52W Low, Market Cap
4. **Info section**: Description, sector, exchange, lot size
5. **Similar Stocks**: Horizontal scrollable cards

**F&O Tab**:
- Futures contracts table
- Mini option chain (11-strike ATM-focused view)
- OI summary bar

**Trade Panel** (slide-over from right, max-w-[400px]):
- Same order form pattern as Trading Page

---

### 9.4 OPTION CHAIN PAGE — ⚠️ DARK THEME

**Layout**: Full-height, NO page scrolling
- `flex flex-col`, `height: calc(100vh - 92px)`, `background: #0a0e17`
- Uses INLINE STYLES with custom color object `C` (not Tailwind classes)

**Custom Color System**:
```
C.bg: '#0a0e17'        C.surface: '#111827'     C.text: '#e8eaed'
C.green: '#22c55e'      C.red: '#ef4444'        C.primary: '#00D09C'
C.gold: '#fbbf24'       C.blue: '#3b82f6'       C.purple: '#a78bfa'
C.border: '#1e293b'     C.atmBg: 'rgba(0,208,156,0.07)'
```

**Sections**:
1. **Index Tabs**: NIFTY, BANKNIFTY, FINNIFTY, SENSEX, MIDCPNIFTY — gradient underline
2. **Market Info Bar**: Spot price (badge), PCR, Max Pain (gold), ATM Straddle (purple), Lot Size
3. **Expiry Bar + View Toggle**: Expiry pills left, LTP/OI toggle right
4. **Option Chain Table**: 6-column CSS grid
   - Sticky header, ITM shading (green left CE, red right PE)
   - ATM row highlighted with special bg + "ATM" label
   - Spot price divider (blue badge with Zap icon)
   - OI bars as gradient backgrounds at 20% opacity
   - Click row → opens trade panel
5. **Trade Panel** (right slide-over, w-[340px]): Dark theme order form

---

### 9.5 PORTFOLIO PAGE

**Layout**: `min-h-screen bg-[#f5f7fa] px-4 sm:px-6 lg:px-8 py-6 space-y-6`

**Sections**:
1. **Header**: "Portfolio" + LIVE badge + DateFilter + "New Trade" button
2. **Total Portfolio Value Card**: Big number `text-3xl sm:text-4xl font-bold font-mono-data` + P&L badge
3. **3 Sub-metrics** (`grid grid-cols-1 sm:grid-cols-3`): Available Balance, Invested, Current Value — each in `bg-[#f8f9fb] rounded-xl p-4`
4. **Summary Cards** (`grid grid-cols-2 lg:grid-cols-4`): Total P&L, Unrealized P&L, Realized P&L, Open Positions — all `border-l-4` with dynamic color
5. **Holdings Table**: 9 columns — Symbol, Direction, Segment, Qty, Avg Price, LTP, P&L, Current Value, Action (Square Off)
6. **Segment Breakdown** (`grid grid-cols-1 sm:grid-cols-3`): Equity/Futures/Options cards
7. **Allocation Donut**: Recharts PieChart, innerRadius 60, outerRadius 85

---

### 9.6 POSITIONS PAGE

**Layout**: `min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8 space-y-5`

**Sections**:
1. **Header**: "Positions" + LIVE badge + DateFilter + segment sub-tabs (Stocks/Index)
2. **Open/Closed Tabs**: `TabsList` with `data-[state=active]:bg-[#00D09C] data-[state=active]:text-white`
3. **Total P&L Banner**: Gradient card `rounded-2xl p-5`, large P&L number `text-[28px]`, LIVE pulse
4. **Position Cards** (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`):
   - **OpenPositionCard**: white, rounded-2xl, border, overflow-hidden, hover:shadow-md
     - Top: Symbol + BUY/SELL badge + LIVE + SL/TGT tags + PnL fill bar
     - Bottom: Entry → LTP → SL → TGT chain with ChevronRight separators
     - Buttons: "View Details" (green outline) + "Exit" (red outline)
   - **ClosedPositionCard**: Same + exit reason badge
5. **Detail Sheet** (bottom drawer, rounded-t-3xl, max-h-[85vh]):
   - P&L Hero gradient box
   - DetailRow: icon in `size-7 rounded-lg bg-[#f5f7fa]` + label + value
   - SL/Target editor: grid-cols-2, red/green labels
   - Square Off button: full-width, bg-[#EB5B3C]

---

### 9.7 ORDERS PAGE

**Layout**: `min-h-screen bg-[#f5f7fa] px-4 sm:px-6 lg:px-8 py-6 space-y-6`

**Sections**:
1. **Stats Grid** (`grid grid-cols-2 lg:grid-cols-4`): Total Orders, Filled, Cancelled, Total Volume — `border-l-4` with icon boxes
2. **Orders Table**: Open Orders / Trade History tabs
   - Tab triggers: `bg-[#f5f7fa] border border-[#e5e7eb] rounded-lg p-1`, active: `bg-[#00D09C] text-white shadow-sm`
   - Status badges: PENDING=amber, PARTIALLY_FILLED=green, FILLED=green, CANCELLED/REJECTED=red, EXPIRED=gray

---

### 9.8 ANALYTICS PAGE — ⚠️ DARK THEME (amber accent)

**Layout**: `min-h-screen bg-[#0a0e17]`, max-w-7xl, p-4 sm:p-6 lg:p-8

**Theme**: Pure dark with **amber** accent (NOT green)
- Cards: `bg-[#111827] border border-[#1f2937] rounded-2xl shadow-md`
- Primary accent: `#f59e0b` (amber)

**Sections**:
1. **Header**: "Performance History" + time range toggle (1D/1W/1M/3M/1Y/ALL)
   - Toggle: `bg-[#111827] border border-[#1f2937] rounded-full p-1`, active: `bg-amber-500 text-black`
2. **Hero Chart**: Area chart with amber gradient, h-[320px] sm:h-[380px]
   - Portfolio value: `font-mono text-3xl font-bold text-white`
3. **Key Metrics** (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`): hover lift `hover:-translate-y-1`
4. **Two-column** (`grid gap-4 lg:grid-cols-3`):
   - Left (2/3): Recent adjustments table, dark scrollbar
   - Right (1/3): Asset allocation donut chart
5. **Promo Banner**: `bg-gradient-to-r from-amber-500 via-amber-500/90 to-emerald-500`

---

### 9.9 REPORTS PAGE

**Layout**: `min-h-screen bg-[#f5f7fa] px-4 sm:px-6 lg:px-8 py-6 space-y-6`

**Sections**:
1. **Stats Grid** (`grid grid-cols-2 lg:grid-cols-4`): Total Trades, Win Rate, Total P&L, Avg P&L/Trade — `border-l-4` dynamic
2. **Two-column** (`grid grid-cols-1 lg:grid-cols-2`):
   - Win/Loss Summary: Win rate bar `h-3`, best/avg stats
   - Segment Breakdown: 3 cards (Equity/Futures/Options)
3. **Recent Trades Table**: 8 columns with all trade details
4. **Performance Summary**: `border-l-4 border-l-[#00D09C]` card
5. **Download Reports** (`grid grid-cols-1 sm:grid-cols-3`): PDF download cards with hover effect

---

### 9.10 FUTURES PAGE

**Layout**: `min-h-screen bg-[#f5f7fa] p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto`

**Sections**:
1. **Instrument Selector**: Pill buttons (NIFTY, BANKNIFTY, etc.), active: `bg-[#00D09C] text-white shadow-md`
2. **Contract Tabs**: 3 month labels with contract details (LTP, Change, OI, Volume)
3. **Main Panel** (`grid grid-cols-1 lg:grid-cols-5 gap-4`):
   - Left (3/5): Price chart (Recharts AreaChart, h-[300px]) + Key Stats grid
   - Right (2/5): Sticky order panel (BUY/SELL toggle, inputs, margin calc, place button)
4. **Open Positions Table**: Desktop-only, with all futures position details

---

### 9.11 LEARNING PAGE

**Layout**: `min-h-screen bg-[#f5f7fa] p-4 sm:p-6 lg:p-8 space-y-6`

**Sections**:
1. **Header**: GraduationCap icon in `size-10 rounded-xl bg-[#00D09C]/10` + "Learning Hub" + module count badge
2. **Overall Progress Card**: Progress bar `h-3 bg-[#f0f0f5]`
3. **Learning Paths** (`grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6`):
   - Each: `bg-white border border-[#e5e7eb] rounded-xl shadow-sm hover:shadow-md border-l-4`
   - Difficulty border: Beginner=green, Intermediate=brand green, Advanced=red
   - Icon in colored box, difficulty badge, duration, modules, description, progress bar, CTA button

---

### 9.12 LEADERBOARD PAGE — ⚠️ DARK THEME (amber accent)

**Layout**: `min-h-screen bg-[#0a0e17] p-4 sm:p-6 lg:p-8 space-y-6`

**Sections**:
1. **Header**: Trophy icon (amber) + "Leaderboard"
2. **Filters**: Time (Weekly/Monthly/All Time) + Category (Overall/Equity/F&O/Index) — active: `bg-amber-500 text-black`
3. **Top 3 Podium** (`grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6`):
   - Rank 1: `sm:scale-105`, Crown icon yellow, avatar size-20, border-yellow-500, ROI text-2xl amber
   - Rank 2/3: Silver/Bronze borders
4. **Full Rankings Table**: Rank, User, ROI%, Win Rate, Trades, P&L, Trend
   - "You" row: `bg-amber-500/5 border-amber-500/20`
5. **Your Ranking Card**: `border-l-4 border-l-amber-500`

---

### 9.13 CHALLENGES PAGE — ⚠️ DARK THEME (amber accent)

**Layout**: `min-h-screen bg-[#0a0e17] p-4 sm:p-6 lg:p-8 space-y-6`

**Sections**:
1. **Active Challenges** (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`): Cards with `border-l-4` dynamic color, progress bars, Join button
2. **My Active Challenges** (`grid grid-cols-1 sm:grid-cols-2`): SVG ProgressRing (80×80), "Continue" button
3. **Upcoming Challenges**: "Notify Me" buttons
4. **Completed Challenges Table**: Won/Lost result badges

---

### 9.14 WATCHLIST PAGE

**Layout**: Standard light theme page

**Sections**:
1. **Header**: "Watchlist" + count badge + gainers/losers counts
2. **Stock list**: Each row with StockLogo, symbol, name, price, change%, remove button
3. **Empty state**: Star icon + "No stocks yet" + "Browse Stocks" link

---

### 9.15 PROFILE PAGE

**Layout**: Standard light theme with Footer

**Sections**:
1. **Profile header**: Avatar, name, email, member since
2. **Stats**: Total trades, win rate, total P&L
3. **Settings**: Password change, 2FA, notifications, connected devices
4. **Account**: Sign out all devices, delete account

---

### 9.16 SETTINGS PAGE

Standard light theme with toggle switches and input fields for app preferences.

---

## 10. SHARED UI COMPONENTS

### 10.1 Trade Confirmation Modal
- Full-screen bottom sheet (mobile), centered card (desktop), max-w-md
- 4 states: confirming → executing → success → error
- Swipe-to-confirm on mobile (framer-motion draggable, 60% threshold)
- Confetti animation on success (20 particles)
- Cost breakdown: Total Value, Brokerage, Total Cost
- Balance check with insufficient balance warning

### 10.2 Index Detail Drawer
- Right-side Sheet, max-w-[900px], bg `#f5f7fa`
- Tabs: Chart | Statistics
- Chart: Recharts AreaChart/CandleChart with range selector (1D to 5Y)
- Statistics: Open, High, Low, Prev Close, 52W range bars, performance metrics

### 10.3 Strike Overview Drawer (Options)
- Right-side Sheet, max-w-[800px], bg `#f5f7fa`
- 3 tabs: Chart | Greeks | OI & Volume
- Chart: Lightweight Charts (TradingView) with candle/line toggle
- Greeks: Delta, Theta, Vega, Gamma, IV, POP — each with colored icon box
- OI: OI change bar, OI-Price sentiment labels

### 10.4 Watchlist Sidebar (Desktop)
- Right sidebar, w-[280px], fixed, white bg, left border `#e8ecf0`
- Header: Star + "Watchlist" + count + gainers/losers
- Stock rows with logo, symbol, price, change%, remove on hover
- AnimatePresence enter/exit animations

### 10.5 Date Filter
- Preset pills: All | Today | Tomorrow | Week | Month | Custom
- Active: `bg-[#00D09C] text-white`; Inactive: `bg-white text-[#6b7280] border-[#e5e7eb]`
- Custom: Popover with Calendar (range mode)

### 10.6 P&L Display
- `PnLDisplay`: Inline text with +/- sign, sizes sm/md/lg, green/red/gray
- `PnLPill`: Badge-style with colored bg+border
- `PriceDisplay`: Price + adjacent PnLPill

### 10.7 Stock Logo
- Tries CDN sources, falls back to gradient initials circle
- Sector-based colors (17 sectors mapped)
- Index logos: N5=green, BN=blue, FN=purple, SX=amber, MN=pink

### 10.8 Trade Success Popup
- Dark theme overlay card (`bg-[#111827]`, `rounded-2xl`)
- Green/red gradient header, CheckCircle2 icon, spring animation
- 2x2 detail grid, auto-closes after 5s

---

## 11. FOOTER

**Background**: `#ffffff`, border-top `#f0f0f0`

**Top section** (flex-col md:flex-row, gap-8):
- Brand column (1/3): Logo + description + social links (Twitter, LinkedIn, YouTube, Discord) — 32px rounded-lg, hover green bg
- Links grid (2/3, 2/4 columns): About Us, Privacy Policy, Terms, Disclaimer, Support, Contact, FAQ, Refund — icons `#00D09C`, hover green

**Disclaimer bar**: `#fffbeb` bg, `#fef3c7` border, `#92400e` text

**Bottom bar**: "© 2025 Pepertect" + "Paper Trading • No Real Money • Learning Only"

---

## 12. ADMIN PANEL

**Layout**: Separate admin sidebar (w-60) + main area, bg `#f5f7fa`

**Navigation sections**:
- OVERVIEW: Dashboard, Analytics
- MANAGEMENT: Users, Paid Users, Free Users, Trades, Positions
- SYSTEM: Reports, Tools, Tickets, Activity Logs, Settings
- ACCOUNT: Profile

**Active item**: `bg-[#00D09C]/10 text-[#00D09C]`
**Topbar**: Page title + date + notification bell + admin avatar

**Shared admin components**:
- `StatCard`: White card, colored icon box, label (xs gray), value (xl mono bold)
- `LoadingSkeleton`: N rows of skeleton bars
- `EmptyState`: Gray icon + title + description
- `SimplePagination`: Previous/Next with "Page X of Y"

---

## 13. FORMATTING STANDARDS

### Indian Number Format (en-IN locale)
- Currency: `₹1,23,456.78` (2 decimals)
- Whole currency: `₹1,23,456`
- Large numbers: `₹1.2L` (lakhs), `₹3.5Cr` (crores)
- Volume: `1.2 Cr`, `500 L`, `1.5K`
- Percent: `+2.45%`, `-1.12%`
- P&L: `+₹1,245.50`

### Status Badge Colors
```
PENDING:         bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20
PARTIALLY_FILLED: bg-[#00D09C]/10 text-[#00D09C]
FILLED:          bg-[#00B386]/10 text-[#00B386]
CANCELLED:       bg-[#EB5B3C]/10 text-[#EB5B3C]
REJECTED:        bg-[#EB5B3C]/10 text-[#EB5B3C]
EXPIRED:         bg-[#6b7280]/10 text-[#6b7280]
OPEN:            bg-[#00D09C]/10 text-[#00D09C]
CLOSED:          bg-[#6b7280]/10 text-[#6b7280]
```

---

## 14. ANIMATION PATTERNS

### Framer Motion (used on all light-themed pages)
```javascript
// Page entry
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }} // bouncy spring

// Staggered children
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.05, duration: 0.3 }}

// Header entry
initial={{ opacity: 0, y: -10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.4 }}

// Stats staggered
delay: 0.1, 0.2, 0.3, 0.4 (for 4 items)
```

### Button Interactions
- `active:scale-95` or `active:scale-[0.98]`
- `transition-all duration-200`
- `hover:-translate-y-1 hover:shadow-lg` (on cards)

### Loading States
- Skeleton: `bg-[#f0f0f5] animate-pulse rounded-lg`
- Spinner: `Loader2 animate-spin` in brand green
- Bouncing dots: 3 dots, staggered `animation-delay: 0ms, 150ms, 300ms`

---

## 15. RESPONSIVE DESIGN RULES

### Breakpoints
- `sm:` (640px) — Search appears, grids expand
- `md:` (768px) — Sidebar visible, position grid 2-col, table columns show
- `lg:` (1024px) — Trading 3-col, futures 5-col, order panels visible

### Mobile-Specific
- Sidebar → Sheet (left, w-[240px])
- Order panels → Bottom sheet or floating bar
- Bottom nav bar (5 items)
- Swipe navigation between pages
- Simplified headers (logo replaces sidebar nav)
- Tables → Cards on small screens

### Desktop-Specific
- Fixed sidebar (240px) + optional watchlist sidebar (280px)
- Main content: `ml-[240px]`
- Full table columns visible
- Order panels as sticky side panels

---

## 16. THEME PAGE MAPPING

| Theme | Pages |
|-------|-------|
| **Light** (green accent #00D09C) | Dashboard, Trading, Stock Overview, Portfolio, Positions, Orders, Reports, Futures, Learning, Watchlist, Profile, Settings, Help Support, Active Devices, all Footer pages |
| **Dark** (amber accent #f59e0b) | Analytics, Leaderboard, Challenges |
| **Dark Terminal** (green accent #00D09C, inline styles) | Option Chain |

---

## 17. KEY INTERACTION PATTERNS

1. **Real-time price updates**: Prices flash green/red briefly on change
2. **Watchlist star toggle**: Click to add/remove, filled/outlined star
3. **Swipe-to-confirm** (mobile): Draggable thumb, 60% threshold, spring physics
4. **Pull-to-refresh**: Custom refresh buttons on data sections
5. **Search with debounce**: 300ms delay, searches stocks/indices
6. **Date filtering**: Shared across Portfolio, Positions, Orders, Reports pages
7. **Trade flow**: Select stock → Order panel → Confirm modal → Success popup
8. **Navigation**: URL sync with pushState, back/forward browser support
9. **Live pulse indicator**: 2s opacity animation on LIVE badges
10. **Confetti on trade success**: 20 particles, random colors, spring physics

---

## 18. INDIAN MARKET-SPECIFIC DATA

### Indices Tracked
- NIFTY 50, SENSEX, BANK NIFTY, FINNIFTY, MIDCPNIFTY

### Stock Sectors (17)
Banking, IT, Pharma, Auto, FMCG, Energy, Metal, Realty, Infrastructure, Telecom, Media, Cement, Chemical, Consumer Durables, Healthcare, Insurance, PSUs

### F&O Instruments
- Index Options (CE/PE), Index Futures, Stock Futures, Stock Options
- Expiries: Weekly + Monthly
- Lot sizes per instrument
- Strike intervals

### Trading Metrics
- Brokerage: 0.05%, min ₹20, max ₹500
- Virtual Balance: ₹1,00,000 default
- P&L calculation with Indian number formatting (lakhs/crores)

---

## END OF PROMPT

This specification covers every visual and interaction detail of the Pepertect V4 platform. Use this as the single source of truth for UI/UX replication.