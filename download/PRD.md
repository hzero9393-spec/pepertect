# Pepertect — Product Requirements Document

> **Version:** 1.0  
> **Date:** 2025  
> **Status:** Active Development  
> **Author:** Pepertect Team

---

## 1. Problem Statement

Beginners and aspiring traders in India face a significant barrier to entering the stock market: **the risk of losing real money while learning**. Specifically:

- **Futures & Options (F&O) trading** is complex and carries high risk — a single wrong trade can wipe out capital
- Existing paper trading platforms are either **too simplified** (don't simulate F&O) or **too expensive** (paid platforms)
- There is no free, realistic platform that simulates the **full NSE experience** — equity, futures, and options with real-time data
- Beginners lack **structured learning paths** to understand derivatives before risking capital
- Without practice, traders develop bad habits and emotional decision-making patterns

**Pepertect solves this** by providing a zero-risk, real-time paper trading platform that mirrors the actual NSE trading experience with virtual currency.

---

## 2. Target Audience

### Primary Users

| Segment | Age Range | Characteristics | Pain Points |
|---------|-----------|-----------------|-------------|
| College Students | 18–25 | Tech-savvy, curious about markets, limited capital | No money to risk, need structured learning |
| Working Professionals | 22–35 | Disposable income, interested in side income, time-constrained | Can't afford to lose money while learning F&O |
| Aspiring Traders | 20–35 | Actively studying markets, want to practice strategies | Need realistic simulation, not toy apps |

### Secondary Users

- **Educational institutions** looking for trading simulation tools
- **Trading communities** wanting to run paper trading competitions
- **Content creators** who want to demonstrate trading strategies

### User Personas

**Persona 1: Rahul, 21, Engineering Student**
- Watches YouTube trading videos but has never placed a real trade
- Wants to practice options strategies (straddles, strangles) without losing money
- Needs step-by-step learning content

**Persona 2: Priya, 28, Software Engineer**
- Has a Demat account but is afraid to trade F&O
- Wants to practice with realistic market data before committing capital
- Values clean UI and mobile access during commute

---

## 3. Solution Overview

**Pepertect** is a web-based paper trading platform that simulates the National Stock Exchange (NSE) experience with:

- **Virtual currency** (no real money involved)
- **Real-time market data** sourced from Yahoo Finance and Upstox API
- **Full segment support**: Equity, Futures, and Options (Calls & Puts)
- **Auto-exit monitoring** via WebSocket for Stop Loss and Target Price execution
- **Structured learning paths** with modules and challenges

### Value Proposition

> "Learn F&O trading with zero risk, real data, and real results."

---

## 4. Key Features

### 4.1 Paper Trading Engine

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Equity Trading** | Buy/sell NSE equities with virtual currency at real-time prices |
| 2 | **Futures Trading** | Trade NSE futures contracts with margin requirements |
| 3 | **Options Trading (CE/PE)** | Trade call and put options with real premium pricing |
| 4 | **Order Types** | MARKET, LIMIT, and Stop Loss (SL) orders |

### 4.2 Market Data

| # | Feature | Description |
|---|---------|-------------|
| 5 | **Real-Time Price Streaming** | Live price updates via WebSocket (Yahoo Finance + Upstox) |
| 6 | **Option Chain with OI** | Full option chain display with Open Interest data |
| 7 | **Market Breadth & Sector Data** | Advance/decline ratios, sector-wise performance |
| 8 | **Index Tracking** | NIFTY 50, SENSEX, BANK NIFTY live tickers |

### 4.3 Portfolio & Risk Management

| # | Feature | Description |
|---|---------|-------------|
| 9 | **Portfolio Tracking** | Real-time portfolio value with unrealized P&L |
| 10 | **Auto-Exit (SL/Target)** | WebSocket-based monitoring that auto-squares positions on SL/Target hit |
| 11 | **P&L Reports** | Detailed trade-by-trade and aggregate P&L analytics |

### 4.4 User Experience

| # | Feature | Description |
|---|---------|-------------|
| 12 | **Watchlist Management** | Add/remove stocks, custom watchlists with live prices |
| 13 | **Dark/Light Theme** | Full dark mode and light mode with persistent preference |
| 14 | **Mobile-Responsive Design** | Swipe navigation, bottom nav bar, optimized for mobile browsers |
| 15 | **Push Notifications** | Alerts for price hits, order fills, and account updates |

### 4.5 Learning & Engagement

| # | Feature | Description |
|---|---------|-------------|
| 16 | **Learning Paths** | Structured modules covering equity, futures, options basics to advanced strategies |
| 17 | **Trading Challenges** | Competitions with leaderboards and virtual rewards |

### 4.6 Platform & Admin

| # | Feature | Description |
|---|---------|-------------|
| 18 | **Authentication** | Email/password registration + Google OAuth login |
| 19 | **Admin Panel** | User management, analytics dashboard, platform settings |
| 20 | **Support Ticket System** | In-app support with ticket creation and tracking |

---

## 5. Subscription Tiers

| Feature | FREE (₹0) | PREMIUM (₹299/mo) |
|---------|-----------|-------------------|
| Equity Paper Trading | ✅ | ✅ |
| Futures Paper Trading | ❌ | ✅ |
| Options Paper Trading | ❌ | ✅ |
| Real-Time Prices | ✅ (delayed) | ✅ (real-time) |
| Option Chain | ❌ | ✅ |
| Auto-Exit (SL/Target) | ❌ | ✅ |
| P&L Reports | Basic | Advanced |
| Watchlist | Up to 10 stocks | Unlimited |
| Learning Paths | First module only | All modules |
| Trading Challenges | ❌ | ✅ |
| Market Breadth Data | ❌ | ✅ |
| Priority Support | ❌ | ✅ |
| Virtual Capital | ₹1,00,000 | ₹10,00,000 |

### Payment Integration

- **Razorpay** for Premium subscription checkout
- Subscription management and renewal handling
- Expiry handling with feature downgrade

---

## 6. Out of Scope

The following features are **explicitly out of scope** for Pepertect:

| Category | Details |
|----------|---------|
| **Real Money Trading** | No actual buy/sell of securities; this is a simulation only |
| **Mutual Funds** | No MF investment tracking or SIP simulation |
| **Commodities** | No MCX commodity trading (gold, silver, crude oil) |
| **Forex/Currency** | No forex pair trading |
| **International Markets** | NSE (India) only; no US, European, or Asian market support |
| **Algorithmic Trading** | No API for automated strategy execution |
| **Social/Copy Trading** | No following or copying other users' trades |
| **Brokerage Integration** | No integration with actual brokers for order placement |
| **Tax Reporting** | No capital gains tax calculation or filing |
| **IPO Applications** | No IPO bidding simulation |

---

## 7. Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| **Performance** | Page load