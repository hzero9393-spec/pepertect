---
Task ID: 1
Agent: Main Agent
Task: Part 1 — Foundation & Design Tokens

Work Log:
- Created GitHub repo (already exists: pepertect-v4-dark-mode)
- Rewrote src/app/globals.css with full Pepertect design token system (12 tokens × 2 themes)
- Updated src/app/layout.tsx with Sora, Inter, IBM Plex Mono fonts + ThemeProvider
- Created src/lib/tier.ts — hasFeature() utility with 12-feature matrix
- Created src/lib/auth.ts — JWT helpers (sign, verify, extractBearer)
- Created src/lib/brokerage.ts — calculateBrokerage() function
- Created src/lib/market-hours.ts — isMarketOpen() IST hours checker
- Created src/lib/validations.ts — 6 Zod schemas (register, login, order, squareOff, watchlist, support)
- Rewrote src/app/page.tsx — verification page with token swatches, font samples, theme toggle
- Verified: GET / returns 200, no errors

Stage Summary:
- All 8 files created/updated successfully
- Design tokens: 12 CSS vars per theme (light + dark), shadcn/ui compatibility mapped
- 3 font families loaded: Sora (headings), Inter (body), IBM Plex Mono (data)
- Utility libraries ready for Parts 3-20
- Dev server running clean on port 3000
