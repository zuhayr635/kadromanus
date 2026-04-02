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
