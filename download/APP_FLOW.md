# Pepertect — Application Flows

> **Last Updated:** 2025  
> **Project:** Pepertect — Paper Trading Platform

---

## Table of Contents

1. [Registration Flow](#1-registration-flow)
2. [Login Flow](#2-login-flow)
3. [Google OAuth Flow](#3-google-oauth-flow)
4. [Trade Placement Flow](#4-trade-placement-flow)
5. [Auto-Exit Flow](#5-auto-exit-flow)
6. [Order Types](#6-order-types)
7. [Trading Segments](#7-trading-segments)

---

## 1. Registration Flow

New users create an account to start paper trading.

```
┌─────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. User navigates to /login                             │
│                    │                                     │
│  2. Clicks "Sign Up" tab                                │
│                    │                                     │
│  3. Enters Email + Password                             │
│     └─ Password validation: min 8 chars, strength check │
│                    │                                     │
│  4. Clicks "Register"                                   │
│                    │                                     │
│  5. Backend validates input                             │
│     ├─ Check email format                               │
│     ├─ Check password strength                          │
│     └─ Check email uniqueness in database               │
│                    │                                     │
│  6. Create user record in PostgreSQL                    │
│     ├─ Hash password (bcrypt)                           │
│     ├─ Assign FREE tier                                 │
│     ├─ Set virtual capital: ₹1,00,000                   │
│     └─ Create portfolio record                          │
│                    │                                     │
│  7. Generate JWT token (7-day expiry)                   │
│                    │                                     │
│  8. Return JWT to client                                │
│                    │                                     │
│  9. Store token (localStorage)                          │
│                    │                                     │
│  10. Redirect to /dashboard                             │
│      └─ User is on FREE tier                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Registration Error Cases

| Scenario | Behavior |
|----------|----------|
| Duplicate email | Return 409 Conflict — "Email already registered" |
| Weak password | Return 400 Bad Request — "Password must be at least 8 characters" |
| Invalid email format | Return 400 Bad Request — "Invalid email format" |
| Server error | Return 500 — Show generic error message |

---

## 2. Login Flow

Returning users authenticate with credentials or Google OAuth.

```
┌─────────────────────────────────────────────────────────┐
│                      LOGIN FLOW                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. User navigates to /login                             │
│                    │                                     │
│  2. Selects login method:                               │
│     ├─ Email + Password                                 │
│     └─ Google OAuth (see Section 3)                     │
│                    │                                     │
│  3. Enters Email + Password                             │
│                    │                                     │
│  4. POST /api/auth/login                                │
│     ├─ Find user by email                               │
│     ├─ Compare password hash (bcrypt)                   │
│     └─ Verify account is active                         │
│                    │                                     │
│  5. Generate JWT token                                  │
│     ├─ Payload: { userId, email, role, tier }           │
│     ├─ Signed with JWT_SECRET                           │
│     └─ Expiry: JWT_EXPIRES_IN (default: 7d)            │
│                    │                                     │
│  6. Return JWT + user profile to client                 │
│                    │                                     │
│  7. Client stores JWT in localStorage                   │
│                    │                                     │
│  8. Initialize WebSocket connection                     │
│     └─ Connect to NEXT_PUBLIC_WS_URL                    │
│                    │                                     │
│  9. Redirect to /dashboard                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Login Error Cases

| Scenario | Behavior |
|----------|----------|
| User not found | Return 404 — "No account found with this email" |
| Wrong password | Return 401 — "Invalid credentials" |
| Account disabled | Return 403 — "Account has been disabled" |

---

## 3. Google OAuth Flow

Users can authenticate using their Google account.

```
┌─────────────────────────────────────────────────────────────┐
│                   GOOGLE OAUTH FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User clicks "Continue with Google" on login page         │
│                        │                                     │
│  2. Client calls GET /api/auth/google                        │
│     └─ Server constructs Google OAuth URL with:              │
│        ├─ client_id: GOOGLE_CLIENT_ID                        │
│        ├─ redirect_uri: GOOGLE_REDIRECT_URI                  │
│        ├─ scope: openid email profile                        │
│        └─ response_type: code                                │
│                        │                                     │
│  3. Browser redirects to Google's consent screen            │
│     └─ User selects Google account and grants permission     │
│                        │                                     │
│  4. Google redirects back to:                                │
│     GOOGLE_REDIRECT_URI?code={auth_code}                     │
│                        │                                     │
│  5. GET /api/auth/google/callback?code={auth_code}          │
│     ├─ Exchange auth_code for tokens (Google API)            │
│     │   POST https://oauth2.googleapis.com/token             │
│     │   Body: code, client_id, client_secret,                │
│     │         redirect_uri, grant_type=authorization_code    │
│     ├─ Decode id_token to get user profile                   │
│     │   ├─ Google user ID                                    │
│     │   ├─ Email                                             │
│     │   └─ Name / Avatar                                     │
│     └─ Find or create user in database                       │
│         ├─ If user exists: update Google ID, login           │
│         └─ If new user: create account with FREE tier,       │
│            ₹1,00,000 virtual capital                         │
│                        │                                     │
│  6. Generate JWT token for session                           │
│                        │                                     │
│  7. Redirect to /dashboard?token={jwt}                       │
│     └─ Client stores token from URL params                   │
│                        │                                     │
│  8. Initialize WebSocket connection                          │
│                        │                                     │
│  9. User is logged in and on dashboard                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Google OAuth Error Cases

| Scenario | Behavior |
|----------|----------|
| User denies permission | Google redirects with `error=access_denied` — show login page |
| Invalid auth code | Return 400 — "Invalid authorization code" |
| Token exchange fails | Return 502 — "Failed to authenticate with Google" |
| `GOOGLE_REDIRECT_URI` mismatch | Google shows error — URIs must match exactly |

---

## 4. Trade Placement Flow

Users place orders to buy or sell instruments.

```
┌─────────────────────────────────────────────────────────────┐
│                  TRADE PLACEMENT FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User browses stocks/futures/options on respective pages │
│                        │                                     │
│  2. Clicks on a stock/derivative to open detail view        │
│                        │                                     │
│  3. Trade panel opens (BUY/SELL toggle)                      │
│                        │                                     │
│  4. User configures order:                                   │
│     ├─ Side: BUY or SELL                                    │
│     ├─ Order Type: MARKET / LIMIT / SL                      │
│     ├─ Quantity: Number of shares/lots                      │
│     ├─ Price: (for LIMIT/SL orders)                         │
│     ├─ Stop Loss: Trigger price for auto-exit              │
│     └─ Target: Profit target for auto-exit                 │
│                        │                                     │
│  5. Client-side validation:                                  │
│     ├─ Quantity > 0                                          │
│     ├─ Sufficient virtual balance/margin                    │
│     ├─ Price > 0 (for LIMIT orders)                         │
│     ├─ SL  current (SELL) │
│     ├─ Target > current price (for BUY) or Target = target → TARGET HIT  │
│         └─ If SELL position:                                │
│             ├─ Check: current_price >= stop_loss → SL HIT   │
│             └─ Check: current_price