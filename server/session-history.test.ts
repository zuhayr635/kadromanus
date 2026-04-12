import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the DB module so tests don't need a real database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

import * as sessionHistory from "./session-history";

describe("Session History", () => {
  it("should return empty array when DB is unavailable", async () => {
    const all = await sessionHistory.getAllSessionHistory();
    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(0);
  });

  it("should return null when DB is unavailable - recordSessionStart", async () => {
    const record = await sessionHistory.recordSessionStart(
      "test-session-1",
      "KDR-TEST123",
      "Test Broadcaster",
      "test_user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );
    expect(record).toBeNull();
  });

  it("should return false when DB is unavailable - updateSessionStats", async () => {
    const result = await sessionHistory.updateSessionStats("test-session-2", {
      totalCardsOpened: 50,
      totalLikes: 1000,
    });
    expect(result).toBe(false);
  });

  it("should return null when DB is unavailable - recordSessionEnd", async () => {
    const result = await sessionHistory.recordSessionEnd("test-session-3", [
      { teamName: "Fenerbahçe", score: 15, players: 11 },
    ]);
    expect(result).toBeNull();
  });

  it("should return false when DB is unavailable - cancelSession", async () => {
    const result = await sessionHistory.cancelSession("test-session-4", "User cancelled");
    expect(result).toBe(false);
  });

  it("should return null when DB is unavailable - getSessionHistory", async () => {
    const result = await sessionHistory.getSessionHistory("non-existent");
    expect(result).toBeNull();
  });

  it("should return empty array when DB is unavailable - getSessionHistoryByLicense", async () => {
    const result = await sessionHistory.getSessionHistoryByLicense("KDR-TEST");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("should return empty array when DB is unavailable - getSessionHistoryByBroadcaster", async () => {
    const result = await sessionHistory.getSessionHistoryByBroadcaster("broadcaster");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("should return zeroed stats when DB is unavailable - getSessionStatistics", async () => {
    const stats = await sessionHistory.getSessionStatistics();
    expect(stats.totalSessions).toBe(0);
    expect(stats.completedSessions).toBe(0);
    expect(stats.totalCards).toBe(0);
    expect(stats.totalLikes).toBe(0);
  });

  it("should return empty array when DB is unavailable - getTopBroadcasters", async () => {
    const result = await sessionHistory.getTopBroadcasters(5);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("should return empty array when DB is unavailable - exportSessionData", async () => {
    const result = await sessionHistory.exportSessionData({ licenseKey: "KDR-TEST" });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("should return 0 when DB is unavailable - clearOldHistory", async () => {
    const result = await sessionHistory.clearOldHistory(30);
    expect(result).toBe(0);
  });
});
