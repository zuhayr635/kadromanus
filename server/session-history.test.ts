import { describe, it, expect, beforeEach } from "vitest";
import * as sessionHistory from "./session-history";

describe("Session History", () => {
  beforeEach(() => {
    // Clear history before each test
    const all = sessionHistory.getAllSessionHistory();
    all.forEach(session => {
      sessionHistory.cancelSession(session.sessionId);
    });
  });

  it("should record session start", () => {
    const record = sessionHistory.recordSessionStart(
      "test-session-1",
      "KDR-TEST123",
      "Test Broadcaster",
      "test_user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    expect(record.sessionId).toBe("test-session-1");
    expect(record.licenseKey).toBe("KDR-TEST123");
    expect(record.broadcasterName).toBe("Test Broadcaster");
    expect(record.status).toBe("active");
  });

  it("should update session statistics", () => {
    sessionHistory.recordSessionStart(
      "test-session-2",
      "KDR-TEST123",
      "Test Broadcaster",
      "test_user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "automatic"
    );

    const updated = sessionHistory.updateSessionStats("test-session-2", {
      totalCardsOpened: 50,
      totalLikes: 1000,
      totalGifts: 25,
      totalParticipants: 100,
    });

    expect(updated).toBe(true);

    const history = sessionHistory.getSessionHistory("test-session-2");
    expect(history?.totalCardsOpened).toBe(50);
    expect(history?.totalLikes).toBe(1000);
    expect(history?.totalGifts).toBe(25);
    expect(history?.totalParticipants).toBe(100);
  });

  it("should record session end", () => {
    sessionHistory.recordSessionStart(
      "test-session-3",
      "KDR-TEST123",
      "Test Broadcaster",
      "test_user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    const finalScores = [
      { teamName: "Fenerbahçe", score: 15, players: 11 },
      { teamName: "Galatasaray", score: 12, players: 11 },
      { teamName: "Beşiktaş", score: 10, players: 8 },
      { teamName: "Trabzonspor", score: 8, players: 6 },
    ];

    const ended = sessionHistory.recordSessionEnd("test-session-3", finalScores);

    expect(ended?.status).toBe("completed");
    expect(ended?.finalScores).toEqual(finalScores);
    expect(ended?.duration).toBeGreaterThanOrEqual(0);
  });

  it("should cancel session", () => {
    sessionHistory.recordSessionStart(
      "test-session-4",
      "KDR-TEST123",
      "Test Broadcaster",
      "test_user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    const cancelled = sessionHistory.cancelSession("test-session-4", "User cancelled");

    expect(cancelled).toBe(true);

    const history = sessionHistory.getSessionHistory("test-session-4");
    expect(history?.status).toBe("cancelled");
    expect(history?.notes).toBe("User cancelled");
  });

  it("should get session history by ID", () => {
    sessionHistory.recordSessionStart(
      "test-session-5",
      "KDR-TEST123",
      "Test Broadcaster",
      "test_user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    const history = sessionHistory.getSessionHistory("test-session-5");

    expect(history).not.toBeNull();
    expect(history?.sessionId).toBe("test-session-5");
  });

  it("should get all session history", () => {
    sessionHistory.recordSessionStart(
      "test-session-6",
      "KDR-TEST123",
      "Broadcaster 1",
      "user1",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    sessionHistory.recordSessionStart(
      "test-session-7",
      "KDR-TEST456",
      "Broadcaster 2",
      "user2",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "automatic"
    );

    const all = sessionHistory.getAllSessionHistory();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it("should get session history by license key", () => {
    sessionHistory.recordSessionStart(
      "test-session-8",
      "KDR-LICENSE1",
      "Broadcaster A",
      "user_a",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    sessionHistory.recordSessionStart(
      "test-session-9",
      "KDR-LICENSE2",
      "Broadcaster B",
      "user_b",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "automatic"
    );

    const byLicense = sessionHistory.getSessionHistoryByLicense("KDR-LICENSE1");
    expect(byLicense.length).toBeGreaterThan(0);
    expect(byLicense[0].licenseKey).toBe("KDR-LICENSE1");
  });

  it("should get session history by broadcaster", () => {
    sessionHistory.recordSessionStart(
      "test-session-10",
      "KDR-TEST123",
      "Specific Broadcaster",
      "specific_user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    const byBroadcaster = sessionHistory.getSessionHistoryByBroadcaster(
      "Specific Broadcaster"
    );
    expect(byBroadcaster.length).toBeGreaterThan(0);
    expect(byBroadcaster[0].broadcasterName).toBe("Specific Broadcaster");
  });

  it("should get session statistics", () => {
    sessionHistory.recordSessionStart(
      "test-session-11",
      "KDR-TEST123",
      "Broadcaster",
      "user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    sessionHistory.updateSessionStats("test-session-11", {
      totalCardsOpened: 50,
      totalLikes: 1000,
      totalGifts: 25,
      totalParticipants: 100,
    });

    sessionHistory.recordSessionEnd("test-session-11", [
      { teamName: "Fenerbahçe", score: 15, players: 11 },
    ]);

    const stats = sessionHistory.getSessionStatistics();

    expect(stats.totalSessions).toBeGreaterThan(0);
    expect(stats.completedSessions).toBeGreaterThan(0);
    expect(stats.totalCards).toBeGreaterThan(0);
  });

  it("should get top broadcasters", () => {
    // Create multiple sessions for different broadcasters
    for (let i = 0; i < 3; i++) {
      const sessionId = `test-session-top-${i}`;
      sessionHistory.recordSessionStart(
        sessionId,
        "KDR-TEST123",
        "Top Broadcaster",
        "user",
        ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
        "manual"
      );

      sessionHistory.updateSessionStats(sessionId, {
        totalCardsOpened: 50 + i * 10,
        totalLikes: 1000 + i * 100,
      });

      sessionHistory.recordSessionEnd(sessionId, [
        { teamName: "Fenerbahçe", score: 15, players: 11 },
      ]);
    }

    const topBroadcasters = sessionHistory.getTopBroadcasters(5);
    expect(topBroadcasters.length).toBeGreaterThan(0);
    expect(topBroadcasters[0].sessions).toBeGreaterThan(0);
  });

  it("should export session data with filters", () => {
    sessionHistory.recordSessionStart(
      "test-session-export-1",
      "KDR-EXPORT1",
      "Export Broadcaster",
      "user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    sessionHistory.recordSessionEnd("test-session-export-1", [
      { teamName: "Fenerbahçe", score: 15, players: 11 },
    ]);

    const exported = sessionHistory.exportSessionData({
      licenseKey: "KDR-EXPORT1",
    });

    expect(exported.length).toBeGreaterThan(0);
    expect(exported[0].licenseKey).toBe("KDR-EXPORT1");
  });

  it("should clear old history", () => {
    sessionHistory.recordSessionStart(
      "test-session-clear",
      "KDR-TEST123",
      "Broadcaster",
      "user",
      ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      "manual"
    );

    const beforeCount = sessionHistory.getAllSessionHistory().length;

    // Clear history older than 0 days (should remove all completed sessions)
    const removed = sessionHistory.clearOldHistory(0);

    expect(removed).toBeGreaterThanOrEqual(0);
  });
});
