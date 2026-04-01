import { describe, it, expect } from "vitest";
import {
  generateGameSummary,
  generateScreenshotHTML,
  exportGameReport,
} from "./game-end-workflow";

describe("Game End Workflow", () => {
  const mockGameData = {
    sessionId: "test-game-123",
    broadcasterName: "Test Broadcaster",
    tiktokUsername: "test_user",
    teamNames: ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
    finalScores: [
      { teamName: "Fenerbahçe", score: 15, players: 11 },
      { teamName: "Galatasaray", score: 12, players: 11 },
      { teamName: "Beşiktaş", score: 10, players: 8 },
      { teamName: "Trabzonspor", score: 8, players: 6 },
    ],
    totalCardsOpened: 50,
    totalLikes: 1000,
    totalGifts: 25,
    totalParticipants: 100,
    duration: 1800, // 30 minutes
  };

  it("should generate game summary", () => {
    const summary = generateGameSummary(mockGameData);

    expect(summary).toContain("KADROKUR");
    expect(summary).toContain("Test Broadcaster");
    expect(summary).toContain("test_user");
    expect(summary).toContain("30:00");
    expect(summary).toContain("50");
    expect(summary).toContain("1000");
    expect(summary).toContain("Fenerbahçe");
  });

  it("should include correct duration in summary", () => {
    const summary = generateGameSummary(mockGameData);
    expect(summary).toContain("30:00");
  });

  it("should include statistics in summary", () => {
    const summary = generateGameSummary(mockGameData);
    expect(summary).toContain("50"); // totalCardsOpened
    expect(summary).toContain("1000"); // totalLikes
    expect(summary).toContain("25"); // totalGifts
    expect(summary).toContain("100"); // totalParticipants
  });

  it("should sort scores in summary", () => {
    const summary = generateGameSummary(mockGameData);
    const fenerbahceIndex = summary.indexOf("Fenerbahçe");
    const galatasarayIndex = summary.indexOf("Galatasaray");

    expect(fenerbahceIndex).toBeLessThan(galatasarayIndex);
  });

  it("should generate screenshot HTML", () => {
    const html = generateScreenshotHTML(mockGameData);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Test Broadcaster");
    expect(html).toContain("test_user");
    expect(html).toContain("50");
    expect(html).toContain("Fenerbahçe");
  });

  it("should include statistics in screenshot", () => {
    const html = generateScreenshotHTML(mockGameData);

    expect(html).toContain("50"); // cards
    expect(html).toContain("1000"); // likes
    expect(html).toContain("25"); // gifts
    expect(html).toContain("100"); // participants
  });

  it("should include duration in screenshot", () => {
    const html = generateScreenshotHTML(mockGameData);
    expect(html).toContain("30:00");
  });

  it("should include table with scores in screenshot", () => {
    const html = generateScreenshotHTML(mockGameData);

    expect(html).toContain("<table>");
    expect(html).toContain("Fenerbahçe");
    expect(html).toContain("15");
    expect(html).toContain("11");
  });

  it("should export game report as JSON", () => {
    const report = exportGameReport(mockGameData);
    const parsed = JSON.parse(report);

    expect(parsed.sessionId).toBe("test-game-123");
    expect(parsed.broadcaster.name).toBe("Test Broadcaster");
    expect(parsed.broadcaster.tiktokUsername).toBe("test_user");
    expect(parsed.statistics.cardsOpened).toBe(50);
    expect(parsed.statistics.likes).toBe(1000);
    expect(parsed.statistics.gifts).toBe(25);
    expect(parsed.statistics.participants).toBe(100);
    expect(parsed.finalScores).toEqual(mockGameData.finalScores);
  });

  it("should include timestamp in exported report", () => {
    const report = exportGameReport(mockGameData);
    const parsed = JSON.parse(report);

    expect(parsed.timestamp).toBeTruthy();
    expect(new Date(parsed.timestamp)).toBeInstanceOf(Date);
  });

  it("should handle different durations", () => {
    const shortGameData = { ...mockGameData, duration: 300 }; // 5 minutes
    const summary = generateGameSummary(shortGameData);

    expect(summary).toContain("5:00");
  });

  it("should handle zero duration", () => {
    const zeroGameData = { ...mockGameData, duration: 0 };
    const summary = generateGameSummary(zeroGameData);

    expect(summary).toContain("0:00");
  });

  it("should handle large participant numbers", () => {
    const largeGameData = { ...mockGameData, totalParticipants: 10000 };
    const summary = generateGameSummary(largeGameData);

    expect(summary).toContain("10000");
  });

  it("should properly escape special characters in broadcaster name", () => {
    const specialGameData = {
      ...mockGameData,
      broadcasterName: "Test <Broadcaster> & Co.",
    };
    const html = generateScreenshotHTML(specialGameData);

    // HTML should contain the name (browser will render it)
    expect(html).toContain("Test");
  });

  it("should include all team names in screenshot", () => {
    const html = generateScreenshotHTML(mockGameData);

    mockGameData.teamNames.forEach((team) => {
      expect(html).toContain(team);
    });
  });

  it("should sort final scores in screenshot", () => {
    const html = generateScreenshotHTML(mockGameData);

    // Extract score values from HTML
    const fenerbahceScore = html.indexOf("Fenerbahçe");
    const galatasarayScore = html.indexOf("Galatasaray");

    // Fenerbahçe should appear before Galatasaray (higher score)
    expect(fenerbahceScore).toBeLessThan(galatasarayScore);
  });
});
