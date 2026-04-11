# Kadrokur v3 — TikTok Live Football Card Game

## Tech Stack
- Backend: Node.js + Express + tRPC 11
- Frontend: React 19 + Vite 7 + Tailwind CSS 4 + Radix UI
- DB: MySQL/TiDB + Drizzle ORM
- Real-time: Socket.io 4
- TikTok: tiktok-live-connector 2.1.1-beta
- Tests: Vitest (13 test files)
- Package manager: pnpm (NOT npm/yarn)

## Commands
`pnpm dev` - Start dev server (tsx watch on server/_core/index.ts)
`pnpm test` - Run Vitest tests
`pnpm check` - TypeScript type check
`pnpm db:push` - Drizzle migrations

## Path Aliases
`@/*` → client/src/*
`@shared/*` → shared/*

## Key Files
- `server/_core/index.ts` - Main server entry point (Express + tRPC + Socket.io)
- `server/game-engine.ts` - Game mechanics (4 teams × 11 players)
- `server/socket-server.ts` - WebSocket + TikTok event handling + Demo mode
- `server/tiktok-integration.ts` - TikTok Live connector (real + demo mode)
- `server/screenshot-service.ts` - Puppeteer screenshot → Telegram
- `server/admin-auth.ts` - JWT auth for admin routes
- `server/license-manager.ts` - License validation
- `server/broadcaster-session.ts` - Session lifecycle
- `drizzle/schema.ts` - DB schema (8 tables: users, licenses, sessions, gameHistory, players, giftTiers, usedPlayers, licenseLogs)

## Architecture Status
- ✅ Socket.io → Game Engine: Fully connected (`socket-server.ts` imports game-engine functions)
- ✅ TikTok → Game Pipeline: Complete flow (tiktok-integration → socket-server → game-engine)
- ✅ Puppeteer Screenshot: Implemented (`screenshot-service.ts` generates HTML, takes screenshot, sends to Telegram)
- ✅ Admin JWT Auth: Implemented (`admin-auth.ts` with sign/verify + cookie management)
- ✅ Demo Mode: Auto-fallback when TikTok connection fails (sends mock gifts/likes every 3-5s)
- ⚠️ Auto Mode (!1-!4): Parsing ready at `socket-server.ts:383`, UI connection pending
- Turkish language preferred in UI/communications

## Testing
- Test files co-located: `*.test.ts` next to source
- Use `vi.mock` for mocking (Vitest)
- Run `pnpm test` before committing
- 13 test files covering core modules

## License System
- Multi-tenant SaaS with packages: Basic, Pro, Premium, Unlimited
- Features gated by license: Telegram bot, auto mode, analytics, multi-session, API access
- License validation in `server/license-manager.ts`

## Game Mechanics
- 4 teams × 11 players = 44 cards ends game
- Card tiers: Bronze(10p), Silver(25p), Gold(50p), Elite(100p)
- 100 likes = 1 auto Bronze card (configurable via `setLikeThreshold`)
- TikTok gifts map to card tiers via diamond count (silver≥10, gold≥50, elite≥200)
- Manual mode: broadcaster selects team via button
- Auto mode: viewers use `!1`-`!4` chat commands (parsing ready, UI pending)

## Static HTML Pages (OBS browser sources)
- `client/public/broadcaster-panel.html` - Game control
- `client/public/game-screen.html` - OBS display
- `client/public/license-panel.html` - License viewer

## Missing Features (Low Priority)
- Player substitution (oyuncu değiştirme)
- Leaderboard page
- Telegram webhook (currently one-way only)
