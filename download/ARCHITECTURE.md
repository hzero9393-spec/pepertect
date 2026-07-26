# Pepertect — Architecture Documentation

> **Last Updated:** 2025  
> **Project:** Pepertect — Paper Trading Platform

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [System Architecture Diagram](#2-system-architecture-diagram)
3. [Services Overview](#3-services-overview)
4. [Data Flow](#4-data-flow)
5. [Authentication Flow](#5-authentication-flow)
6. [Database Schema](#6-database-schema)
7. [State Management](#7-state-management)
8. [Client-Side Routing](#8-client-side-routing)

---

## 1. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js (App Router) | 16 | Full-stack React framework with SSR/SSG |
| **UI Library** | React | 19 | Component-based UI |
| **Language** | TypeScript | 5.x | Type-safe JavaScript |
| **Styling** | Tailwind CSS | 4 | Utility-first CSS framework |
| **Component Library** | shadcn/ui | Latest | Accessible, composable UI components |
| **ORM** | Prisma | Latest | Type-safe database client & migrations |
| **Database** | PostgreSQL (Supabase) | 15+ | Relational database, hosted |
| **State Management** | Zustand | Latest | Lightweight global state management |
| **Real-Time** | Socket.io | Latest | WebSocket communication (client ↔ server) |
| **Market Data** | Yahoo Finance API | — | Fallback price data (polling) |
| **Market Data** | Upstox API | — | Primary real-time market data (WebSocket + REST) |
| **Auth** | JWT (jsonwebtoken) | — | Stateless authentication tokens |
| **Payments** | Razorpay | — | Premium subscription payments |
| **OAuth** | Google Identity Services | — | Third-party authentication |

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js App Router (Port 3000)                     │   │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐ ┌──────────────┐ │   │
│  │  │ Pages   │ │ shadcn/  │ │  Zustand  │ │ Socket │ │  React 19    │ │   │
│  │  │ (App    │ │  ui      │ │  Stores   │ │ .io    │ │  Components  │ │   │
│  │  │  Router)│ │  Comps   │ │           │ │ Client │ │              │ │   │
│  │  └────┬────┘ └──────────┘ └───────────┘ └───┬────┘ └──────────────┘ │   │
│  │       │                                       │                      │   │
│  │       ▼                                       ▼                      │   │
│  │  ┌──────────┐                         ┌──────────┐                  │   │
│  │  │ API      │                         │ WebSocket│                  │   │
│  │  │ Routes   │                         │ Client   │                  │   │
│  │  │ (/api/*) │                         │ (Socket) │                  │   │
│  │  └────┬─────┘                         └────┬─────┘                  │   │
│  └───────┼────────────────────────────────────┼────────────────────────┘   │
└──────────┼────────────────────────────────────┼────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐          ┌──────────────────────────────┐
│   Prisma ORM         │          │   WebSocket Service           │
│   (Database Client)  │          │   (Socket.io Server)          │
└──────────┬───────────┘          └──────────┬───────────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────┐          ┌──────────────────────────────┐
│   PostgreSQL         │          │   Market Data Manager         │
│   (Supabase)         │          │   ├─ Yahoo Finance (polling)  │
│   34 Tables          │          │   └─ Upstox API (WebSocket)   │
└──────────────────────┘          └──────────────────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────────┐
                                  │   Upstox API /       │
                                  │   Yahoo Finance      │
                                  │   (External APIs)    │
                                  └──────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                            DATA FLOW SUMMARY
═══════════════════════════════════════════════════════════════════════════

  User Action → API Route → Prisma Query → PostgreSQL → Response → UI Update
                                                                        
  Market Data → Upstox/Yahoo → WebSocket Service → Socket.io → Client UI
```

---

## 3. Services Overview

### Service 1: Next.js App (Port 3000)

**Hosted on:** Vercel (production) / Local (development)  
**Role:** Frontend application + REST API routes

| Component | Description |
|-----------|-------------|
| **App Router Pages** | Client-side rendered pages using Next.js App Router |
| **API Routes (`/api/*`)** | Server-side REST endpoints for all business logic |
| **Prisma Client** | Type-safe database queries on every API call |
| **JWT Middleware** | Token verification on protected routes |
| **Zustand Stores** | Client-side global state (auth, app, watchlist) |

### Service 2: WebSocket Service (Port 3001)

**Hosted on:** Render (production) / Local (development)  
**Role:** Real-time bidirectional communication

| Component | Description |
|-----------|-------------|
| **Socket.io Server** | WebSocket server for real-time price streaming |
| **Connection Manager** | Handles client connections, disconnections, reconnections |
| **Price Broadcasting** | Pushes price updates to all connected clients |

### Service 3: Market Data Manager

**Hosted on:** Render (alongside WebSocket Service)  
**Role:** Fetches and processes market data from external sources

| Source | Method | Data | Fallback Priority |
|--------|--------|------|-------------------|
| **Upstox API** | WebSocket + REST | Real-time prices, option chain, OI | Primary |
| **Yahoo Finance** | HTTP REST (polling) | Delayed prices, historical data | Fallback |

### Service 4: Global SL Monitor (Client-Side)

**Hosted on:** Runs in the user's browser  
**Role:** Monitors open positions for Stop Loss and Target hits

| Component | Description |
|-----------|-------------|
| **GlobalSLMonitor** | React component that listens to WebSocket price updates |
| **Position Tracker** | Maintains list of open positions with SL/Target prices |
| **Auto-Square-Off** | Triggers API call to close position when SL/Target is hit |
| **Notification** | Shows in-app notification after auto-exit |

---

## 4. Data Flow

### 4.1 Standard API Request Flow

```
1. User clicks "Place Order" in the UI
         │
2. Client-side validation (quantity, price, balance, tier)
         │
3. POST /api/trade/order with JWT in Authorization header
         │
4. API Route: Extract & verify JWT → Get userId
         │
5. API Route: Validate inputs server-side (Zod schema)
         │
6. API Route: Check market hours (if ENFORCE_MARKET_HOURS)
         │
7. API Route: Prisma query to check balance/margin
         │
8. API Route: Prisma query to create Order record
         │
9. API Route: Prisma query to create/update Position record
         │
10. API Route: Return response { success: true, order, position }
         │
11. Client: Update Zustand stores → UI re-renders
```

### 4.2 Real-Time Price Update Flow

```
1. Market Data Manager fetches price from Upstox/Yahoo
         │
2. Price data emitted via Socket.io server
         │
3. All connected clients receive price event
         │
4. Client Socket.io listener receives price
         │
5. Zustand store updates with new price
         │
6. UI components re-render with new price
         │
7. GlobalSLMonitor checks if SL/Target is hit
         │
8. If hit → triggers auto-exit (see APP_FLOW.md)
```

---

## 5. Authentication Flow

```
┌──────────┐      ┌───────────┐      ┌───────────┐      ┌──────────┐
│  Client   │─────▶│  API      │─────▶│  Prisma   │─────▶│PostgreSQL│
│  (JWT in  │      │  Route    │      │  Query    │      │          │
│   header) │      │  (verify) │      │  (find)   │      │ (Users)  │
└──────────┘      └───────────┘      └───────────┘      └──────────┘

Authentication Flow:
                                                                
  Login Request  ──▶  JWT Verification  ──▶  User Lookup  ──▶  Authorized
                                                                        │
  No Token      ──▶  401 Unauthorized                                  │
  Expired Token ──▶  401 Unauthorized ──▶  Redirect to Login            │
  Invalid Token ──▶  401 Unauthorized ──▶  Redirect to Login            │
```

### JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "clx...",
    "email": "user@example.com",
    "role": "USER",
    "tier": "PREMIUM",
    "iat": 1700000000,
    "exp": 1700604800
  },
  "signature": "..."
}
```

---

## 6. Database Schema

### Overview

- **Database:** PostgreSQL hosted on Supabase
- **ORM:** Prisma with `prisma/schema.prisma`
- **Tables:** 34 tables total

### Key Table Groups

| Group | Tables | Description |
|-------|--------|-------------|
| **Users & Auth** | `User`, `Session`, `ActiveDevice` | User accounts, sessions, device tracking |
| **Market Data** | `Stock`, `Index`, `Sector` | Stock master data, indices, sector info |
| **Trading** | `Order`, `Position`, `Trade` | Orders placed, open/closed positions, execution log |
| **Derivatives** | `Option`, `Future`, `OptionChain` | Option contracts, futures contracts, OI data |
| **Portfolio** | `Portfolio`, `Transaction` | Portfolio summary, balance transactions |
| **Learning** | `LearningPath`, `Module`, `Challenge`, `UserProgress` | Educational content and progress |
| **Subscriptions** | `Subscription`, `Payment` | User subscription tiers, Razorpay payments |
| **Support** | `SupportTicket`, `TicketMessage` | User support requests |
| **Platform** | `PlatformSetting`, `ActivityLog` | Admin settings, audit logs |
| **Notifications** | `Notification` | In-app notifications |

### Entity Relationships (Simplified)

```
User ──────┬─── Order ────── Trade
           ├─── Position ─── Trade
           ├─── Portfolio ─── Transaction
           ├─── Watchlist ─── Stock
           ├─── Subscription ─── Payment
           ├─── UserProgress ─── Module
           ├─── SupportTicket ─── TicketMessage
           ├─── ActiveDevice
           └─── Notification

Stock ──────┬─── Option
           ├─── Future
           └─── OptionChain

Index ────── Sector
```

### Schema Management

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Create a migration (production)
npx prisma migrate dev --name description

# Apply migrations (production)
npx prisma migrate deploy

# Seed initial data
npx prisma db seed
```

---

## 7. State Management

Pepertect uses **Zustand** for client-side global state. Each store manages a specific domain.

### Store Architecture

```
┌─────────────────────────────────────────────┐
│              Zustand Stores                  │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │  useAuthStore │  │   useAppStore       │  │
│  │              │  │                     │  │
│  │ • user       │  │ • currentPage       │  │
│  │ • token      │  │ • theme (dark/light)│  │
│  │ • isAuthenticated│ • sidebarOpen     │  │
│  │ • login()    │  │ • navigate()       │  │
│  │ • logout()   │  │ • notification     │  │
│  └──────────────┘  └─────────────────────┘  │
│                                              │
│  ┌──────────────────┐                       │
│  │  useWatchlistStore│                       │
│  │                  │                       │
│  │ • watchlist      │                       │
│  │ • addStock()     │                       │
│  │ • removeStock()  │                       │
│  └──────────────────┘                       │
│                                              │
└─────────────────────────────────────────────┘
```

### useAuthStore

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `user` | `User \| null` | Current authenticated user object |
| `token` | `string \| null` | JWT token |
| `isAuthenticated` | `boolean` | Derived: `!!token && !!user` |
| `login(email, password)` | `async function` | Authenticate and set session |
| `loginWithGoogle()` | `async function` | Initiate Google OAuth flow |
| `logout()` | `function` | Clear token and user, redirect to login |

### useAppStore

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `currentPage` | `string` | Current active page identifier |
| `theme` | `'light' \| 'dark'` | UI theme preference |
| `sidebarOpen` | `boolean` | Sidebar expanded/collapsed (desktop) |
| `navigate(page)` | `function` | Change current page |
| `toggleTheme()` | `function` | Switch between dark and light mode |

### useWatchlistStore

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `watchlist` | `Stock[]` | User's watchlist stocks |
| `addStock(stock)` | `async function` | Add stock to watchlist (API call) |
| `removeStock(symbol)` | `async function` | Remove stock from watchlist (API call) |

---

## 8. Client-Side Routing

Pepertect uses a **single catch-all route** with URL-based page switching managed by Zustand, rather than Next.js file-based routing for every page.

### Routing Mechanism

```
File: app/[...slug]/page.tsx

All URLs → Catch-all slug → AppShell component → Zustand currentPage → Render page
```

### How It Works

1. **Catch-all route** (`app/[...slug]/page.tsx`) captures all URL paths
2. **AppShell** reads the URL slug and maps it to a page identifier
3. **useAppStore** holds the `currentPage` state
4. **Conditional rendering** renders the appropriate page component based on `currentPage`
5. **URL updates** via `window.history.pushState` or Next.js router

### URL → Page Mapping

| URL Pattern | Page | Component |
|------------|------|-----------|
| `/` | Dashboard | `DashboardPage` |
| `/login` | Login/Register | `AuthPage` |
| `/stocks` | Stock Listing | `StocksPage` |
| `/stock/:symbol` | Stock Detail | `StockDetailPage` |
| `/watchlist` | Watchlist | `WatchlistPage` |
| `/futures` | Futures Trading | `FuturesPage` |
| `/option-chain` | Option Chain | `OptionChainPage` |
| `/positions` | Open Positions | `PositionsPage` |
| `/orders` | Order History | `OrdersPage` |
| `/portfolio` | Portfolio & P&L | `PortfolioPage` |
| `/reports` | Reports & Analytics | `ReportsPage` |
| `/learning` | Learning Paths | `LearningPage` |
| `/profile` | User Profile | `ProfilePage` |
| `/admin` | Admin Panel | `AdminPage` |
| `/support` | Help & Support | `SupportPage` |

### Navigation

- **Desktop:** Sidebar navigation (collapsible)
- **Mobile:** Bottom navigation bar with swipe gestures
- **Page transitions:** Instant (no loading spinners for client-side navigation)

---

## File Structure (Simplified)

```
pepertect-v4-dark-mode/
├── app/
│   ├── [...slug]/page.tsx       # Catch-all route (single entry point)
│   ├── layout.tsx                # Root layout (providers, theme)
│   └── api/
│       ├── auth/                 # Login, register, Google OAuth
│       ├── trade/                # Orders, positions, square-off
│       ├── stocks/               # Stock data, search
│       ├── portfolio/            # Portfolio, P&L
│       ├── watchlist/            # Watchlist CRUD
│       ├── learning/             # Learning content
│       ├── subscription/         # Subscription management
│       ├── support/              # Support tickets
│       └── admin/                # Admin endpoints
├── components/
│   ├── AppShell.tsx              # Main layout shell
│   ├── GlobalSLMonitor.tsx       # Auto-exit monitoring
│   ├── trade/                    # Trade panel, order forms
│   ├── market/                   # Stock cards, tickers
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth.ts                   # JWT utilities
│   └── utils.ts                  # General utilities
├── stores/
│   ├── useAuthStore.ts           # Authentication state
│   ├── useAppStore.ts            # App state (navigation, theme)
│   └── useWatchlistStore.ts      # Watchlist state
├── prisma/
│   ├── schema.prisma             # Database schema (34 tables)
│   └── seed.ts                   # Seed data script
├── public/                       # Static assets
└── package.json
```

---

*For deployment details, see [DEPLOYMENT.md](./DEPLOYMENT.md).*  
*For environment variables, see [ENV_SETUP.md](./ENV_SETUP.md).*