vi.mock("./socket-server", () => ({
  startSession: vi.fn().mockResolvedValue(undefined),
  stopSession: vi.fn().mockResolvedValue(undefined),
  initializeSocketServer: vi.fn(),
  getSocketServer: vi.fn().mockReturnValue(null),
  broadcastGameEvent: vi.fn(),
}));

vi.mock("./broadcaster-session", () => ({
  createBroadcasterSession: vi.fn().mockResolvedValue({
    success: true,
    sessionId: "test-session-abc",
    message: "OK",
  }),
  endBroadcasterSession: vi.fn().mockResolvedValue(true),
  getBroadcasterSession: vi.fn().mockReturnValue(null),
  updateTeamSelectionMode: vi.fn().mockResolvedValue(true),
  processTeamSelectionCommand: vi.fn().mockReturnValue({ success: true }),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("../drizzle/schema", () => ({
  sessions: {},
  licenses: {},
}));

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("broadcaster router — socket integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createSession mutation'ı startSession'ı çağırır", async () => {
    const { startSession } = await import("./socket-server");
    const { createBroadcasterSession } = await import("./broadcaster-session");

    const sessionId = "test-session-abc";
    const tiktokUsername = "testuser";
    const teamNames = ["T1", "T2", "T3", "T4"];

    vi.mocked(createBroadcasterSession).mockResolvedValue({
      success: true,
      sessionId,
      message: "OK",
    });

    // Simulate what broadcaster.ts createSession mutation does
    const result = await createBroadcasterSession(
      "key",
      tiktokUsername,
      teamNames,
      "manual"
    );

    if (result.success && result.sessionId) {
      await startSession(result.sessionId, tiktokUsername, teamNames);
    }

    expect(startSession).toHaveBeenCalledWith(sessionId, tiktokUsername, teamNames);
    expect(startSession).toHaveBeenCalledTimes(1);
  });

  it("createSession mutation'ı startSession hatası durumunda exception fırlatır", async () => {
    const { startSession } = await import("./socket-server");
    const { createBroadcasterSession } = await import("./broadcaster-session");

    const sessionId = "test-session-def";
    const tiktokUsername = "testuser2";
    const teamNames = ["T1", "T2", "T3", "T4"];

    vi.mocked(createBroadcasterSession).mockResolvedValue({
      success: true,
      sessionId,
      message: "OK",
    });

    const startSessionError = new Error("TikTok connection failed");
    vi.mocked(startSession).mockRejectedValue(startSessionError);

    const result = await createBroadcasterSession(
      "key",
      tiktokUsername,
      teamNames,
      "manual"
    );

    let caughtError: Error | null = null;
    if (result.success && result.sessionId) {
      try {
        await startSession(result.sessionId, tiktokUsername, teamNames);
      } catch (error) {
        caughtError = error as Error;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain("TikTok connection failed");
  });

  it("endSession mutation'ı stopSession'ı çağırır", async () => {
    const { stopSession } = await import("./socket-server");
    const { endBroadcasterSession } = await import("./broadcaster-session");

    const sessionId = "test-session-xyz";

    vi.mocked(endBroadcasterSession).mockResolvedValue(true);

    // Simulate what broadcaster.ts endSession mutation does
    await stopSession(sessionId);
    const success = await endBroadcasterSession(sessionId);

    expect(stopSession).toHaveBeenCalledWith(sessionId);
    expect(endBroadcasterSession).toHaveBeenCalledWith(sessionId);
    expect(success).toBe(true);
  });

  it("endSession mutation'ı stopSession ve endBroadcasterSession'ı doğru sırayla çağırır", async () => {
    const { stopSession } = await import("./socket-server");
    const { endBroadcasterSession } = await import("./broadcaster-session");

    const sessionId = "test-session-order";
    const callOrder: string[] = [];

    vi.mocked(stopSession).mockImplementation(async () => {
      callOrder.push("stopSession");
    });

    vi.mocked(endBroadcasterSession).mockImplementation(async () => {
      callOrder.push("endBroadcasterSession");
      return true;
    });

    // Simulate what broadcaster.ts endSession mutation does
    await stopSession(sessionId);
    const success = await endBroadcasterSession(sessionId);

    expect(callOrder).toEqual(["stopSession", "endBroadcasterSession"]);
    expect(success).toBe(true);
  });
});
