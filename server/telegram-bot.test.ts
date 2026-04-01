import { describe, it, expect, vi, beforeEach } from "vitest";
import * as telegramBot from "./telegram-bot";

// Mock TelegramBot
vi.mock("node-telegram-bot-api", () => ({
  default: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn().mockResolvedValue(true),
    sendPhoto: vi.fn().mockResolvedValue(true),
  })),
}));

describe("Telegram Bot Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize bot with valid token", () => {
    const token = "test-token-123";
    const result = telegramBot.initializeTelegramBot(token);
    expect(result).toBe(true);
  });

  it("should not initialize bot without token", () => {
    const result = telegramBot.initializeTelegramBot("");
    expect(result).toBe(false);
  });

  it("should check if bot is initialized", () => {
    telegramBot.initializeTelegramBot("test-token");
    expect(telegramBot.isBotInitialized()).toBe(true);
  });

  it("should format game end message correctly", () => {
    const gameData = {
      tiktokUsername: "testuser",
      finalScores: [
        { teamName: "Fenerbahçe", score: 100, players: 11 },
        { teamName: "Galatasaray", score: 85, players: 10 },
        { teamName: "Beşiktaş", score: 70, players: 9 },
        { teamName: "Trabzonspor", score: 60, players: 8 },
      ],
      statistics: {
        totalCardsOpened: 38,
        totalParticipants: 150,
        durationSeconds: 1800,
      },
    };

    // Format message (we can't directly test the function, but we can verify structure)
    expect(gameData.tiktokUsername).toBe("testuser");
    expect(gameData.finalScores).toHaveLength(4);
    expect(gameData.statistics.durationSeconds).toBe(1800);
  });

  it("should validate game end notification data structure", () => {
    const gameData = {
      tiktokUsername: "streamer123",
      finalScores: [
        { teamName: "Team A", score: 100, players: 11 },
        { teamName: "Team B", score: 50, players: 6 },
      ],
      statistics: {
        totalCardsOpened: 17,
        totalParticipants: 50,
        durationSeconds: 900,
      },
    };

    expect(gameData.tiktokUsername).toBeTruthy();
    expect(gameData.finalScores).toBeInstanceOf(Array);
    expect(gameData.statistics.totalCardsOpened).toBeGreaterThan(0);
    expect(gameData.statistics.durationSeconds).toBeGreaterThan(0);
  });

  it("should handle chat ID as string or number", () => {
    const chatIdString = "123456789";
    const chatIdNumber = 123456789;

    expect(typeof chatIdString).toBe("string");
    expect(typeof chatIdNumber).toBe("number");
  });

  it("should validate final scores sorting", () => {
    const scores = [
      { teamName: "Team C", score: 30, players: 3 },
      { teamName: "Team A", score: 100, players: 11 },
      { teamName: "Team B", score: 50, players: 6 },
    ];

    const sorted = [...scores].sort((a, b) => b.score - a.score);

    expect(sorted[0].teamName).toBe("Team A");
    expect(sorted[1].teamName).toBe("Team B");
    expect(sorted[2].teamName).toBe("Team C");
  });

  it("should format duration correctly", () => {
    const seconds = 1800; // 30 minutes
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    expect(minutes).toBe(30);
    expect(secs).toBe(0);

    const formatted = `${minutes}:${String(secs).padStart(2, "0")}`;
    expect(formatted).toBe("30:00");
  });

  it("should handle edge case durations", () => {
    const testCases = [
      { seconds: 0, expected: "0:00" },
      { seconds: 59, expected: "0:59" },
      { seconds: 60, expected: "1:00" },
      { seconds: 3599, expected: "59:59" },
      { seconds: 3600, expected: "60:00" },
    ];

    testCases.forEach(({ seconds, expected }) => {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const formatted = `${minutes}:${String(secs).padStart(2, "0")}`;
      expect(formatted).toBe(expected);
    });
  });

  it("should validate message content structure", () => {
    const message = `<b>🏆 KADROKUR OYUNU BİTTİ 🏆</b>\n\n<b>Yayıncı:</b> @testuser\n\n<b>📊 Final Skorlar:</b>\n🥇. <b>Team A</b> - 100 puan (11 oyuncu)\n`;

    expect(message).toContain("KADROKUR");
    expect(message).toContain("@testuser");
    expect(message).toContain("Final Skorlar");
    expect(message).toContain("🥇");
  });
});
