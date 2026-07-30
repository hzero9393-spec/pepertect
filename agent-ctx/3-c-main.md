# Task 3-c: Limit Order Feature Implementation

## Summary
Implemented a comprehensive limit order system across the pepertect paper trading platform, including:
1. **LimitOrderModal** — New bottom-sheet modal for placing limit orders
2. **OptionChainPage** — Added click-to-order flow with Market/Limit choice popup
3. **TradePage** — Added Pending Limit Orders section in Orders tab
4. **PositionsPage** — Added Pending Positions section above regular positions

## Files Created
- `/src/components/trading/LimitOrderModal.tsx` — Limit order placement modal with:
  - Mobile-first bottom sheet design
  - Market price display, editable limit price, quantity with +/- buttons
  - Live total value calculation
  - Side indicator (green BUY / red SELL)
  - Full-width submit button
  - POST to `/api/orders` with `orderType: 'LIMIT'`

## Files Modified
- `/src/components/trading/OptionChainPage.tsx`:
  - Made CE/PE LTP cells clickable
  - Added floating choice popup with Market Order, Buy Limit, Sell Limit options
  - Integrated LimitOrderModal component
  - Passed `onPriceClick` callback through to `OptionChainTable`

- `/src/components/trading/TradePage.tsx`:
  - Added `useLimitOrderMonitor()` hook activation
  - Added `PendingLimitOrders` component with gold-highlighted section
  - Shows symbol label, side pill, limit price, live LTP, progress bar
  - Inline edit mode for limit price
  - Cancel button integration

- `/src/components/portfolio/PositionsPage.tsx`:
  - Added `useLimitOrderMonitor()` and `useOrders()` hooks
  - Added `PendingLimitPositions` component above regular positions
  - Shows target price, live LTP, progress bar, PENDING badge
  - Edit and Cancel buttons with inline editing

## Pre-existing Issues (not introduced)
- setState in useEffect warnings (pre-existing across codebase)
- Parsing errors in OptionChainPage — fixed the ternary JSX fragment wrapping
