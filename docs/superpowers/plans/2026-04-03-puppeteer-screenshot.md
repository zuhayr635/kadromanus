# Puppeteer Screenshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a game session ends, automatically screenshot the final scores as a styled HTML page and send the image to a configured Telegram group.

**Architecture:** A new `screenshot-service.ts` module generates an HTML string with final scores, renders it headlessly via Puppeteer, and calls the existing `sendPhoto()` in `telegram-bot.ts`. Triggered fire-and-forget from `stopSession()` in `socket-server.ts`.

**Tech Stack:** puppeteer ^22.x, Node.js fs/tmp, existing telegram-bot.ts, Vitest (unit tests for HTML generator only)

---

## Files

| File | Action |
|---|---|
| `server/screenshot-service.ts` | Create — HTML generator + Puppeteer screenshot + send |
| `server/screenshot-service.test.ts` | Create — unit tests for `generateResultsHTML` |
| `server/socket-server.ts` | Modify `stopSession()` at line 210 |
| `package.json` | Add `puppeteer` dependency |
| `Dockerfile` | Add Chromium apk deps + ENV vars (production stage) |
| `.env.example` | Create with required env vars |

---

### Task 1: Install puppeteer

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install puppeteer**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm add puppeteer
```

Expected: `puppeteer` appears in `package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add puppeteer dependency"
```

---

### Task 2: Write tests for generateResultsHTML

**Files:**
- Create: `server/screenshot-service.test.ts`

`generateResultsHTML` is a pure function — testable without Puppeteer.

- [ ] **Step 1: Create test file**

```typescript
// server/screenshot-service.test.ts
import { describe, it, expect } from "vitest";
import { generateResultsHTML } from "./screenshot-service";

const sampleGameData = {
  sessionId: "test-session-01",
  tiktokUsername: "testuser",
  finalScores: [
    { teamName: "Fenerbahce", score: 100, players: 11 },
    { teamName: "Galatasaray", score: 85, players: 10 },
    { teamName: "Besiktas", score: 70, players: 9 },
    { teamName: "Trabzonspor", score: 60, players: 8 },
  ],
  statistics: {
    totalCardsOpened: 38,
    totalParticipants: 124,
    durationSeconds: 1845,
  },
};

describe("generateResultsHTML", () => {
  it("returns a valid HTML string", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
  });

  it("includes tiktok username", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("testuser");
  });

  it("includes all team names sorted by score descending", () => {
    const html = generateResultsHTML(sampleGameData);
    const fenIdx = html.indexOf("Fenerbahce");
    const galIdx = html.indexOf("Galatasaray");
    expect(fenIdx).toBeLessThan(galIdx); // higher score appears first
  });

  it("includes team scores", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("100");
    expect(html).toContain("85");
  });

  it("formats duration as mm:ss", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("30:45"); // 1845 seconds = 30m 45s
  });

  it("includes stats", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("38"); // totalCardsOpened
    expect(html).toContain("124"); // totalParticipants
  });

  it("contains no external resource URLs", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).not.toMatch(/src=["']https?:\/\//);
    expect(html).not.toMatch(/href=["']https?:\/\//);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (module not found)**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm test server/screenshot-service.test.ts
```

Expected: FAIL with "Cannot find module './screenshot-service'"

---

### Task 3: Implement screenshot-service.ts

**Files:**
- Create: `server/screenshot-service.ts`

- [ ] **Step 1: Create the file**

```typescript
// server/screenshot-service.ts
import puppeteer from "puppeteer";
import fs from "fs";
import os from "os";
import path from "path";
import { sendPhoto, isBotInitialized } from "./telegram-bot";

export interface GameResultData {
  sessionId: string;
  tiktokUsername: string;
  finalScores: Array<{ teamName: string; score: number; players: number }>;
  statistics: {
    totalCardsOpened: number;
    totalParticipants: number;
    durationSeconds: number;
  };
}

export function generateResultsHTML(data: GameResultData): string {
  const { tiktokUsername, finalScores, statistics } = data;

  const sorted = [...finalScores].sort((a, b) => b.score - a.score);
  const ranks = ["1.", "2.", "3.", "4."];

  const durationMin = Math.floor(statistics.durationSeconds / 60);
  const durationSec = String(statistics.durationSeconds % 60).padStart(2, "0");
  const duration = `${durationMin}:${durationSec}`;

  const rows = sorted
    .map(
      (team, i) => `
    <tr>
      <td class="rank">${ranks[i] || `${i + 1}.`}</td>
      <td class="team">${team.teamName}</td>
      <td class="score">${team.score}</td>
      <td class="players">${team.players} oyuncu</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:800px; height:500px; overflow:hidden;
    font-family:'Segoe UI',system-ui,sans-serif;
    background:#030a06; color:#e2e8f0;
    display:flex; flex-direction:column;
  }
  .header {
    background:linear-gradient(135deg,#0a1a0f,#0d2010);
    border-bottom:2px solid #22c55e;
    padding:1.25rem 1.5rem;
    display:flex; align-items:center; justify-content:space-between;
  }
  .title { font-size:1.3rem; font-weight:800; letter-spacing:0.1em; color:#22c55e; }
  .sub { font-size:0.72rem; color:#166534; letter-spacing:0.08em; margin-top:2px; }
  .user { font-size:0.82rem; color:#4ade80; font-weight:600; }
  .body { flex:1; padding:1.25rem 1.5rem; }
  table { width:100%; border-collapse:collapse; }
  thead tr { border-bottom:1px solid #14532d; }
  thead th {
    font-size:0.65rem; font-weight:700; letter-spacing:0.1em;
    color:#166534; text-transform:uppercase; padding:0 0 0.5rem;
    text-align:left;
  }
  thead th.score, thead th.players { text-align:right; }
  tbody tr { border-bottom:1px solid #14532d33; }
  tbody tr:last-child { border-bottom:none; }
  td { padding:0.65rem 0; font-size:0.9rem; }
  td.rank { color:#4ade80; font-weight:800; width:2.5rem; }
  td.team { color:#e2e8f0; font-weight:600; }
  td.score { text-align:right; color:#22c55e; font-weight:800; font-size:1rem; }
  td.players { text-align:right; color:#6b7280; font-size:0.78rem; width:6rem; }
  .footer {
    background:#0a1a0f;
    border-top:1px solid #14532d;
    padding:0.75rem 1.5rem;
    display:flex; gap:2rem;
  }
  .stat-label { font-size:0.6rem; font-weight:700; letter-spacing:0.1em; color:#166534; text-transform:uppercase; }
  .stat-val { font-size:0.95rem; font-weight:800; color:#4ade80; margin-top:1px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">KADROKUR — OYUN SONUCU</div>
      <div class="sub">TikTok Live Futbol Karti Oyunu</div>
    </div>
    <div class="user">@${tiktokUsername}</div>
  </div>
  <div class="body">
    <table>
      <thead>
        <tr>
          <th></th>
          <th>Takim</th>
          <th class="score">Puan</th>
          <th class="players">Kadro</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="footer">
    <div>
      <div class="stat-label">Acilan Kart</div>
      <div class="stat-val">${statistics.totalCardsOpened}</div>
    </div>
    <div>
      <div class="stat-label">Katilimci</div>
      <div class="stat-val">${statistics.totalParticipants}</div>
    </div>
    <div>
      <div class="stat-label">Sure</div>
      <div class="stat-val">${duration}</div>
    </div>
  </div>
</body>
</html>`;
}

export async function takeScreenshot(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 500 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.screenshot({ type: "png" });
    return buffer as Buffer;
  } finally {
    await browser.close();
  }
}

export async function screenshotAndSend(
  data: GameResultData,
  chatId: string | undefined
): Promise<void> {
  if (!chatId) {
    console.warn("[screenshot] TELEGRAM_GROUP_CHAT_ID not set — skipping screenshot");
    return;
  }

  if (!isBotInitialized()) {
    console.warn("[screenshot] Telegram bot not initialized — skipping screenshot");
    return;
  }

  const filePath = path.join(os.tmpdir(), `kadrokur-result-${data.sessionId}.png`);

  try {
    const html = generateResultsHTML(data);
    const buffer = await takeScreenshot(html);
    fs.writeFileSync(filePath, buffer);

    const caption = `Kadrokur oyunu bitti! @${data.tiktokUsername} — ${data.statistics.totalCardsOpened} kart, ${data.statistics.totalParticipants} katilimci`;
    await sendPhoto(chatId, filePath, caption);
    console.log(`[screenshot] Sent to Telegram chat ${chatId}`);
  } catch (error) {
    console.error("[screenshot] Failed:", error);
  } finally {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.warn(`[screenshot] Failed to clean up ${filePath}:`, e);
    }
  }
}
```

- [ ] **Step 2: Run tests**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm test server/screenshot-service.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add server/screenshot-service.ts server/screenshot-service.test.ts
git commit -m "feat: add screenshot-service with Puppeteer and Telegram send"
```

---

### Task 4: Wire into socket-server.ts

**Files:**
- Modify: `server/socket-server.ts` lines 209-220

Current `stopSession()`:
```typescript
async stopSession(sessionId: string) {
  await stopTikTokConnection(sessionId);
  const result = endGame(sessionId);
  if (result) {
    this.broadcastGameEnded(sessionId, {
      finalScores: result.finalScores,
      statistics: result.statistics,
    });
  }
  cleanupGame(sessionId);
}
```

- [ ] **Step 1: Add import at top of socket-server.ts**

After the existing imports (around line 17), add:

```typescript
import { screenshotAndSend } from "./screenshot-service";
import { getBroadcasterSession } from "./broadcaster-session";
```

Note: `getBroadcasterSession` is already imported — check if it's there; if so, skip that line.

- [ ] **Step 2: Replace stopSession() body**

```typescript
async stopSession(sessionId: string) {
  await stopTikTokConnection(sessionId);
  const result = endGame(sessionId);

  if (result) {
    this.broadcastGameEnded(sessionId, {
      finalScores: result.finalScores,
      statistics: result.statistics,
    });

    // Fire-and-forget screenshot — does not block cleanup
    const session = getBroadcasterSession(sessionId);
    if (session) {
      void screenshotAndSend(
        {
          sessionId,
          tiktokUsername: session.tiktokUsername,
          finalScores: result.finalScores,
          statistics: result.statistics,
        },
        process.env.TELEGRAM_GROUP_CHAT_ID
      );
    }
  }

  cleanupGame(sessionId);
}
```

- [ ] **Step 3: Check TypeScript compiles**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run full test suite**

```bash
pnpm test
```

Expected: All existing tests still pass (screenshot is fire-and-forget, doesn't affect other flows).

- [ ] **Step 5: Commit**

```bash
git add server/socket-server.ts
git commit -m "feat: trigger screenshot-and-send on game end in stopSession"
```

---

### Task 5: Update Dockerfile and env

**Files:**
- Modify: `Dockerfile`
- Create: `.env.example`

- [ ] **Step 1: Update Dockerfile production stage**

In the **production stage** (second `FROM node:22-alpine`), insert after the `FROM` line and before `WORKDIR /app`, before any `COPY` or `RUN` instructions:

```dockerfile
# Chromium for Puppeteer screenshots
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

- [ ] **Step 2: Create .env.example**

```bash
# .env.example
DATABASE_URL=mysql://user:password@host:3306/kadrokur

TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_GROUP_CHAT_ID=-100xxxxxxxxxx

PORT=3000
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile .env.example
git commit -m "feat: add Chromium to Dockerfile and .env.example for screenshot feature"
```

---

### Task 6: Manual verification checklist

No automated test for the full Puppeteer flow. Verify manually:

- [ ] Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_GROUP_CHAT_ID` in `.env`
- [ ] Start dev server: `pnpm dev`
- [ ] Start a game session via BroadcasterPanel, trigger game end (fill all 44 card slots or call `stopSession` via API)
- [ ] Verify: Telegram group receives a PNG image with team scores
- [ ] Verify: No `/tmp/kadrokur-result-*.png` files left behind after send
- [ ] Verify: Server logs show `[screenshot] Sent to Telegram chat ...`
