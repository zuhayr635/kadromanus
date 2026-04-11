import { recordSessionEnd } from "./session-history";
import { sendMessage, sendPhoto, sendGameEndNotification } from "./telegram-bot";

/**
 * Game end workflow handler
 * Handles screenshot capture, Telegram notification, and session recording
 */

interface GameEndData {
  sessionId: string;
  broadcasterName: string;
  tiktokUsername: string;
  teamNames: string[];
  finalScores: Array<{
    teamName: string;
    score: number;
    players: number;
  }>;
  totalCardsOpened: number;
  totalLikes: number;
  totalGifts: number;
  totalParticipants: number;
  duration: number; // seconds
  screenshotUrl?: string;
}

/**
 * Generate game end summary
 */
export function generateGameSummary(data: GameEndData): string {
  const durationMinutes = Math.floor(data.duration / 60);
  const durationSeconds = data.duration % 60;

  const scoresText = data.finalScores
    .sort((a, b) => b.score - a.score)
    .map((s, idx) => `${idx + 1}. ${s.teamName}: ${s.score} puan (${s.players} oyuncu)`)
    .join("\n");

  return `
🎮 **KADROKUR - OYUN SONU RAPORU**

📺 **Yayıncı:** ${data.broadcasterName}
👤 **TikTok:** @${data.tiktokUsername}

⏱️ **Oyun Süresi:** ${durationMinutes}:${durationSeconds.toString().padStart(2, "0")}

📊 **İstatistikler:**
• Açılan Kartlar: ${data.totalCardsOpened}
• Beğeni: ${data.totalLikes}
• Hediye: ${data.totalGifts}
• Katılımcılar: ${data.totalParticipants}

🏆 **Final Sıralaması:**
${scoresText}

✨ Oyun başarıyla tamamlandı!
`;
}

/**
 * Generate HTML screenshot content
 */
export function generateScreenshotHTML(data: GameEndData): string {
  const durationMinutes = Math.floor(data.duration / 60);
  const durationSeconds = data.duration % 60;

  const scoresHTML = data.finalScores
    .sort((a, b) => b.score - a.score)
    .map(
      (s, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${s.teamName}</td>
      <td>${s.score}</td>
      <td>${s.players}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kadrokur - Oyun Sonu</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 800px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .title {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 18px;
      color: #666;
      margin-bottom: 20px;
    }
    .broadcaster-info {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .broadcaster-name {
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }
    .broadcaster-username {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-box {
      background: #f0f4ff;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      border-left: 4px solid #667eea;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
    }
    .scores-section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #f9f9f9;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #666;
      border-bottom: 2px solid #e0e0e0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    tr:hover {
      background: #f9f9f9;
    }
    .duration {
      text-align: center;
      font-size: 16px;
      color: #666;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #e0e0e0;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">🏆 OYUN SONU</div>
      <div class="subtitle">Kadrokur - TikTok Live Futbol Kartları</div>
    </div>

    <div class="broadcaster-info">
      <div class="broadcaster-name">${data.broadcasterName}</div>
      <div class="broadcaster-username">@${data.tiktokUsername}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-label">Kartlar</div>
        <div class="stat-value">${data.totalCardsOpened}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Beğeni</div>
        <div class="stat-value">${data.totalLikes}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Hediye</div>
        <div class="stat-value">${data.totalGifts}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Katılımcılar</div>
        <div class="stat-value">${data.totalParticipants}</div>
      </div>
    </div>

    <div class="scores-section">
      <div class="section-title">🏅 Final Sıralaması</div>
      <table>
        <thead>
          <tr>
            <th>Sıra</th>
            <th>Takım</th>
            <th>Puan</th>
            <th>Oyuncu</th>
          </tr>
        </thead>
        <tbody>
          ${scoresHTML}
        </tbody>
      </table>
    </div>

    <div class="duration">
      ⏱️ Oyun Süresi: ${durationMinutes}:${durationSeconds.toString().padStart(2, "0")}
    </div>

    <div class="footer">
      Kadrokur © 2026 | Tüm hakları saklıdır
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Process game end workflow
 */
export async function processGameEnd(data: GameEndData): Promise<{
  success: boolean;
  message: string;
  screenshotUrl?: string;
  telegramMessageId?: number;
}> {
  try {
    console.log(`[GameEnd] Oyun sonu işlemi başlatılıyor: ${data.sessionId}`);

    // 1. Record session end in history
    await recordSessionEnd(data.sessionId, data.finalScores, "Oyun başarıyla tamamlandı");

    // 2. Generate summary
    const summary = generateGameSummary(data);
    console.log(`[GameEnd] Oyun özeti oluşturuldu`);

    // 3. Send Telegram notification
    let telegramMessageId: number | undefined;
    try {
      const chatId = process.env.TELEGRAM_GROUP_ID || "";
      if (chatId) {
        const success = await sendMessage(chatId, summary);
        if (success) {
          console.log(`[GameEnd] Telegram bildirimi gönderildi`);
        }
      }
    } catch (error) {
      console.warn(`[GameEnd] Telegram bildirimi gönderilemedi:`, error);
    }

    // 4. Generate screenshot HTML
    const screenshotHTML = generateScreenshotHTML(data);
    console.log(`[GameEnd] Ekran görüntüsü HTML'i oluşturuldu`);

    // 5. Send screenshot to Telegram if available
    if (data.screenshotUrl) {
      try {
        const chatId = process.env.TELEGRAM_GROUP_ID || "";
        if (chatId) {
          const success = await sendPhoto(chatId, data.screenshotUrl, `Oyun Sonu - ${data.broadcasterName}`);
          if (success) {
            console.log(`[GameEnd] Ekran görüntüsü Telegram'a gönderildi`);
          }
        }
      } catch (error) {
        console.warn(`[GameEnd] Ekran görüntüsü gönderilemedi:`, error);
      }
    }

    return {
      success: true,
      message: "Oyun sonu işlemi başarıyla tamamlandı",
      screenshotUrl: data.screenshotUrl,
      telegramMessageId,
    };
  } catch (error) {
    console.error(`[GameEnd] Oyun sonu işlemi hatası:`, error);
    return {
      success: false,
      message: `Oyun sonu işlemi başarısız: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  }
}

/**
 * Export game end report as JSON
 */
export function exportGameReport(data: GameEndData): string {
  const report = {
    timestamp: new Date().toISOString(),
    sessionId: data.sessionId,
    broadcaster: {
      name: data.broadcasterName,
      tiktokUsername: data.tiktokUsername,
    },
    statistics: {
      duration: data.duration,
      cardsOpened: data.totalCardsOpened,
      likes: data.totalLikes,
      gifts: data.totalGifts,
      participants: data.totalParticipants,
    },
    finalScores: data.finalScores,
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Download game end screenshot
 */
export async function downloadGameScreenshot(
  sessionId: string,
  data: GameEndData
): Promise<Buffer> {
  // In production, use a library like puppeteer or playwright to capture screenshots
  // For now, we'll generate the HTML and return it as a buffer
  const html = generateScreenshotHTML(data);
  return Buffer.from(html, "utf-8");
}
