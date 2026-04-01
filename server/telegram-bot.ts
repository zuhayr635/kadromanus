import TelegramBot from "node-telegram-bot-api";

let bot: TelegramBot | null = null;

/**
 * Initialize Telegram bot
 */
export function initializeTelegramBot(token: string): boolean {
  try {
    if (!token) {
      console.warn("[Telegram] Bot token not provided");
      return false;
    }

    bot = new TelegramBot(token, { polling: false });
    console.log("[Telegram] Bot initialized successfully");
    return true;
  } catch (error) {
    console.error("[Telegram] Failed to initialize bot:", error);
    return false;
  }
}

/**
 * Send message to Telegram group
 */
export async function sendMessage(
  chatId: string | number,
  message: string
): Promise<boolean> {
  if (!bot) {
    console.warn("[Telegram] Bot not initialized");
    return false;
  }

  try {
    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
    });
    console.log(`[Telegram] Message sent to ${chatId}`);
    return true;
  } catch (error) {
    console.error(`[Telegram] Failed to send message to ${chatId}:`, error);
    return false;
  }
}

/**
 * Send photo to Telegram group
 */
export async function sendPhoto(
  chatId: string | number,
  photoPath: string,
  caption?: string
): Promise<boolean> {
  if (!bot) {
    console.warn("[Telegram] Bot not initialized");
    return false;
  }

  try {
    await bot.sendPhoto(chatId, photoPath, {
      caption: caption || "",
      parse_mode: "HTML",
    });
    console.log(`[Telegram] Photo sent to ${chatId}`);
    return true;
  } catch (error) {
    console.error(`[Telegram] Failed to send photo to ${chatId}:`, error);
    return false;
  }
}

/**
 * Send game end notification with scores
 */
export async function sendGameEndNotification(
  chatId: string | number,
  gameData: {
    tiktokUsername: string;
    finalScores: Array<{ teamName: string; score: number; players: number }>;
    statistics: {
      totalCardsOpened: number;
      totalParticipants: number;
      durationSeconds: number;
    };
  }
): Promise<boolean> {
  if (!bot) {
    console.warn("[Telegram] Bot not initialized");
    return false;
  }

  try {
    const message = formatGameEndMessage(gameData);
    await bot.sendMessage(chatId, message, {
      parse_mode: "HTML",
    });
    console.log(`[Telegram] Game end notification sent to ${chatId}`);
    return true;
  } catch (error) {
    console.error(`[Telegram] Failed to send game end notification:`, error);
    return false;
  }
}

/**
 * Format game end message
 */
function formatGameEndMessage(gameData: {
  tiktokUsername: string;
  finalScores: Array<{ teamName: string; score: number; players: number }>;
  statistics: {
    totalCardsOpened: number;
    totalParticipants: number;
    durationSeconds: number;
  };
}): string {
  const { tiktokUsername, finalScores, statistics } = gameData;

  let message = `<b>🏆 KADROKUR OYUNU BİTTİ 🏆</b>\n\n`;
  message += `<b>Yayıncı:</b> @${tiktokUsername}\n\n`;

  message += `<b>📊 Final Skorlar:</b>\n`;
  const sortedScores = [...finalScores].sort((a, b) => b.score - a.score);
  const medals = ["🥇", "🥈", "🥉", "4️⃣"];

  sortedScores.forEach((score, idx) => {
    message += `${medals[idx] || idx + 1}. <b>${score.teamName}</b> - ${score.score} puan (${score.players} oyuncu)\n`;
  });

  message += `\n<b>📈 İstatistikler:</b>\n`;
  message += `• Açılan Kartlar: ${statistics.totalCardsOpened}\n`;
  message += `• Katılımcılar: ${statistics.totalParticipants}\n`;
  message += `• Süre: ${Math.floor(statistics.durationSeconds / 60)}:${String(
    statistics.durationSeconds % 60
  ).padStart(2, "0")}\n`;

  return message;
}

/**
 * Check if bot is initialized
 */
export function isBotInitialized(): boolean {
  return bot !== null;
}

/**
 * Get bot instance
 */
export function getBot(): TelegramBot | null {
  return bot;
}
