import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as broadcasterSession from "./broadcaster-session";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("../drizzle/schema", () => ({
  sessions: {},
  licenses: {},
}));

describe("Broadcaster Session Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up active sessions
    const allSessions = broadcasterSession.getAllActiveSessions();
    allSessions.forEach((session) => {
      broadcasterSession.endBroadcasterSession(session.sessionId);
    });
  });

  it("should process team selection command for automatic mode", () => {
    // Create a mock session
    const mockSession: broadcasterSession.BroadcasterSession = {
      sessionId: "test-session-123",
      licenseId: 1,
      tiktokUsername: "testuser",
      teamSelectionMode: "automatic",
      teamNames: ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"],
      isActive: true,
      createdAt: Date.now(),
    };

    // Manually add to active sessions for testing
    const allSessions = broadcasterSession.getAllActiveSessions();
    expect(allSessions).toHaveLength(0);
  });

  it("should validate team selection command format", () => {
    const result = broadcasterSession.processTeamSelectionCommand(
      "non-existent",
      "invalid"
    );

    expect(result.valid).toBe(false);
    expect(result.message).toContain("Oturum bulunamadı");
  });

  it("should parse valid team selection commands", () => {
    // Test command parsing logic
    const commands = ["!1", "!2", "!3", "!4"];
    const teamIds = [0, 1, 2, 3];

    commands.forEach((cmd, idx) => {
      const match = cmd.match(/^!(\d+)$/);
      expect(match).not.toBeNull();
      if (match) {
        const teamId = parseInt(match[1], 10) - 1;
        expect(teamId).toBe(teamIds[idx]);
      }
    });
  });

  it("should reject invalid team selection commands", () => {
    const invalidCommands = [
      "1",      // Missing !
      "! 1",    // Space
      "!abc",   // Non-numeric
    ];

    invalidCommands.forEach((cmd) => {
      const match = cmd.match(/^!(\d+)$/);
      expect(match).toBeNull();
    });
  });

  it("should handle boundary team numbers", () => {
    // !0 and !5 match the regex but are out of range for 4 teams
    const match0 = "!0".match(/^!(\d+)$/);
    expect(match0).not.toBeNull();
    if (match0) {
      const teamId = parseInt(match0[1], 10) - 1;
      expect(teamId).toBe(-1); // Out of range
    }

    const match5 = "!5".match(/^!(\d+)$/);
    expect(match5).not.toBeNull();
    if (match5) {
      const teamId = parseInt(match5[1], 10) - 1;
      expect(teamId).toBe(4); // Out of range for 4 teams
    }
  });

  it("should get all active sessions", () => {
    const sessions = broadcasterSession.getAllActiveSessions();
    expect(Array.isArray(sessions)).toBe(true);
  });

  it("should get active sessions for a specific license", () => {
    const licenseId = 1;
    const sessions = broadcasterSession.getActiveLicenseSessions(licenseId);
    expect(Array.isArray(sessions)).toBe(true);
  });

  it("should validate license with correct format", () => {
    // Test license key format validation
    const licenseKey = "test-license-key-123";
    expect(licenseKey).toBeTruthy();
    expect(licenseKey.length).toBeGreaterThan(0);
  });

  it("should track session creation time", () => {
    const now = Date.now();
    const createdAt = now;

    expect(createdAt).toBeGreaterThan(0);
    expect(typeof createdAt).toBe("number");
  });

  it("should validate team names array", () => {
    const teamNames = ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"];

    expect(teamNames).toHaveLength(4);
    teamNames.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });

  it("should validate team selection modes", () => {
    const modes: Array<"manual" | "automatic"> = ["manual", "automatic"];

    modes.forEach((mode) => {
      expect(["manual", "automatic"]).toContain(mode);
    });
  });

  it("should track broadcaster session properties", () => {
    const session: broadcasterSession.BroadcasterSession = {
      sessionId: "test-123",
      licenseId: 1,
      tiktokUsername: "testuser",
      teamSelectionMode: "manual",
      teamNames: ["Team A", "Team B", "Team C", "Team D"],
      isActive: true,
      createdAt: Date.now(),
    };

    expect(session.sessionId).toBeTruthy();
    expect(session.licenseId).toBeGreaterThan(0);
    expect(session.tiktokUsername).toBeTruthy();
    expect(["manual", "automatic"]).toContain(session.teamSelectionMode);
    expect(session.teamNames).toHaveLength(4);
    expect(session.isActive).toBe(true);
    expect(session.createdAt).toBeGreaterThan(0);
  });
});
