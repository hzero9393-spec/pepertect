---
Task ID: 3
Agent: main
Task: Fix watchlist system - add/remove stocks, sync state, star buttons, clear all

Work Log:
- Investigated watchlist API route: Found `deleteFirst()` is NOT a valid Prisma method (causes 500 errors)
- Found `createdAt` vs `addedAt` field mismatch - schema uses `addedAt`, API used `createdAt`
- Created shared Zustand watchlist store (`src/lib/watchlist-store.ts`) for instant cross-component sync
- Fixed API route: replaced `deleteFirst()` with `delete()` + `deleteMany()` for proper Prisma operations
- Fixed API route: changed `orderBy: { createdAt: 'desc' }` to `orderBy: { addedAt: 'desc' }`
- Fixed API route: changed `item.createdAt` to `item.addedAt` in response mapping
- Added star/watchlist toggle button on trading page stock rows
- Added Clear All button on watchlist page (parallel deletion)
- Made remove buttons visible on mobile (md:opacity-0 instead of opacity-0)
- Added Sonner Toaster to layout.tsx for toast notifications (was missing!)
- Fixed sonner.tsx to not depend on next-themes ThemeProvider
- Updated watchlist sidebar, page, and stock overview to use shared store
- Added watchlist store cleanup on logout
- Pushed to GitHub, auto-deploys to Vercel

Stage Summary:
- Watchlist add/remove now works properly (fixed Prisma deleteFirst bug)
- Star buttons appear on trading page stock list
- All components (trading page, watchlist page, sidebar, stock overview) sync via shared store
- Toast notifications now visible (Sonner Toaster added to layout)
- Clear All button added to watchlist page
- Mobile-friendly remove buttons
