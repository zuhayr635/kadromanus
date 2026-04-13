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
`pnpm build` - Production build (Vite + esbuild)
`pnpm test` - Run Vitest tests
`pnpm check` - TypeScript type check
`pnpm db:push` - Drizzle migrations

## Environment Variables
- `DATABASE_URL` - MySQL/TiDB connection string (required)
- `JWT_SECRET` - Admin JWT signing secret (required)
- `TELEGRAM_BOT_TOKEN` - Telegram bot token (optional)
- `TELEGRAM_CHAT_ID` - Telegram group/channel ID (optional)
- `TIKTOK_SESSION_ID` - TikTok session cookie (required for TikTok Live)

## Path Aliases
`@/*` → client/src/*
`@shared/*` → shared/*

## Key Files
- `server/_core/index.ts` - Main server entry point (Express + tRPC + Socket.io)
- `server/game-engine.ts` - Game mechanics (4 teams × 11 players)
- `server/socket-server.ts` - WebSocket + TikTok event handling
- `server/tiktok-integration.ts` - TikTok Live connector
- `server/gift-manager.ts` - Gift DB queries with filters (search, cost, quality)
- `server/game-end-workflow.ts` - End-game screenshot + Telegram send flow
- `server/session-history.ts` - Game session history & replay
- `server/storage.ts` - File/media storage helpers
- `server/telegram-bot.ts` - Telegram bot (send messages/photos)
- `server/screenshot-service.ts` - Puppeteer screenshot → Telegram
- `server/admin-auth.ts` - JWT auth for admin routes
- `server/license-manager.ts` - License validation
- `server/broadcaster-session.ts` - Session lifecycle
- `drizzle/schema.ts` - DB schema (13 tables: users, licenses, licenseLogs, sessions, gameHistory, usedPlayers, players, giftTiers, cardPacks, licenseCardPacks, appSettings, webhooks, notificationLog)

## tRPC Routers
- `server/routers/admin.ts` - Admin operations
- `server/routers/broadcaster.ts` - Broadcaster session control
- `server/routers/game.ts` - Game state & card actions
- `server/routers/license.ts` - License CRUD & validation
- `server/routers/players.ts` - Player pool management

## Architecture Status
- ✅ Socket.io → Game Engine: Fully connected (`socket-server.ts` imports game-engine functions)
- ✅ TikTok → Game Pipeline: Complete flow (tiktok-integration → socket-server → game-engine)
- ✅ Puppeteer Screenshot: Implemented (`screenshot-service.ts` generates HTML, takes screenshot, sends to Telegram)
- ✅ Admin JWT Auth: Implemented (`admin-auth.ts` with sign/verify + cookie management)
- ❌ Demo Mode: Removed - TikTok Live connection required, errors are thrown on failure
- ❌ Auto Mode (!1-!4): Removed - only Manual mode is supported
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
- Manual mode: broadcaster selects team via button (only supported mode)

## Static HTML Pages (OBS browser sources)
- `client/src/pages/BroadcasterPanel.tsx` - Game control (React app, NOT static HTML)
- `client/public/game-screen.html` - OBS display
- `client/public/license-panel.html` - License viewer
- `client/public/admin-dashboard.html` - Admin UI (static)
- `client/public/admin-login.html` - Admin login (static)

## Deployment
- `Dockerfile` + `docker-compose.yml` mevcut — Coolify uyumlu
- Port: 3000 (bağlı değilse otomatik artar)

## Gotchas
- `server/` içindeki `.mjs` dosyaları (30+) seed/migration scriptleridir — oyun kodu değil, dokunma
- `pnpm` zorunlu — npm/yarn kullanma (lockfile uyumsuzluğu yaratır)
- TikTok Live bağlantısı **zorunlu** — demo mode kaldırıldı, başarısız olursa hata fırlatılır
- Auto Mode kaldırıldı — sadece Manual mode destekleniyor
- `broadcaster-panel.html` artık yok — React sayfası `BroadcasterPanel.tsx` kullanılıyor

## Missing Features (Low Priority)
- Player substitution (oyuncu değiştirme)
- Leaderboard page
- Telegram webhook (currently one-way only)
