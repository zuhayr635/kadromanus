# Puppeteer Screenshot — Design Spec

## Overview

When a Kadrokur game session ends, automatically take a screenshot of the final scores and send it to a configured Telegram group. The screenshot is generated server-side using Puppeteer rendering an in-memory HTML string — no HTTP round-trip, no timing dependency on live server state.

## Architecture

### New file: `server/screenshot-service.ts`

Three exported functions:

**`generateResultsHTML(gameData)`**
Produces a self-contained HTML string (no external resources) styled with the dark green football theme (matching BroadcasterPanel). Viewport: 800×500px. Content:
- Header: "KADROKUR — OYUN SONUCU" with session username
- Team results table sorted by score (1st–4th), each row showing rank, team name, score, player count
- Footer stats row: total cards opened, participants, duration (mm:ss)

**`takeScreenshot(html: string): Promise<Buffer>`**
Launches Puppeteer with `--no-sandbox --disable-setuid-sandbox` flags (required for Docker). Sets viewport to 800×500. Calls `page.setContent(html, { waitUntil: 'networkidle0' })`. Returns PNG buffer. Always closes the browser in a finally block.

**`screenshotAndSend(gameData, chatId: string): Promise<void>`**
Calls `generateResultsHTML` → `takeScreenshot` → writes buffer to a temp file (`/tmp/kadrokur-result-<sessionId>.png`) → calls `telegram-bot.sendPhoto(chatId, filePath, caption)` → deletes temp file. Errors are caught and logged but do not throw (non-blocking).

### Integration: `server/socket-server.ts`

In `stopSession(sessionId)`, before calling `cleanupGame()`:
1. Capture `endGame(sessionId)` result (already done — it returns `finalScores` + `statistics`)
2. Get `tiktokUsername` from `getBroadcasterSession(sessionId)`
3. Call `screenshotAndSend(gameData, process.env.TELEGRAM_GROUP_CHAT_ID)` — fire and forget (no await)
4. Then `cleanupGame(sessionId)`

### Configuration

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Existing — bot token |
| `TELEGRAM_GROUP_CHAT_ID` | New — target group chat ID |

If `TELEGRAM_GROUP_CHAT_ID` is not set or bot is not initialized, `screenshotAndSend` logs a warning and returns early without error.

## Dependencies

**Add to `package.json`:**
```
puppeteer: ^22.x
```

**Add to `Dockerfile` (before `npm install`):**
```dockerfile
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

## Error Handling

- If `TELEGRAM_GROUP_CHAT_ID` is missing → log warning, skip silently
- If Puppeteer launch fails → log error, skip silently
- If Telegram send fails → log error, skip silently
- None of these errors propagate to `stopSession` — game cleanup always completes

## Testing

No automated tests for this module (Puppeteer in CI is heavy). Manual test path:
1. Start a session, trigger game end
2. Verify PNG file appears in /tmp, bot sends it to group
3. Verify `/tmp` file is deleted after send

## File Changes Summary

| File | Change |
|---|---|
| `server/screenshot-service.ts` | New — screenshot logic |
| `server/socket-server.ts` | Modify `stopSession()` to call screenshotAndSend |
| `package.json` | Add `puppeteer` dependency |
| `Dockerfile` | Add Chromium apt deps + env vars |
| `.env.example` | Add `TELEGRAM_GROUP_CHAT_ID` |
