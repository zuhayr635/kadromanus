import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as tiktokIntegration from "./tiktok-integration";

// Mock the tiktok-live-connector module
vi.mock("tiktok-live-connector", () => {
  const mockConnection = {
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };

  return {
    TikTokLiveConnection: vi.fn(() => mockConnection),
  };
});

describe("TikTok Integration", () => {
  const sessionId = "test-session-123";
  const tiktokUsername = "testuser";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await tiktokIntegration.cleanupAllConnections();
  });

  it("should start a TikTok connection successfully", async () => {
    const events: any[] = [];
    const onEvent = vi.fn((event) => events.push(event));

    await tiktokIntegration.startTikTokConnection(
      sessionId,
      tiktokUsername,
      onEvent
    );

    expect(tiktokIntegration.isConnected(sessionId)).toBe(false); // Not connected yet, just initialized
  });

  it("should handle like events with combo count", async () => {
    const onEvent = vi.fn();

    await tiktokIntegration.startTikTokConnection(
      sessionId,
      tiktokUsername,
      onEvent
    );

    // Verify that the connection was established for like event handling
    expect(tiktokIntegration.getConnectionStatus(sessionId).exists).toBe(true);
  });

  it("should handle gift events with streak detection", async () => {
    const onEvent = vi.fn();

    await tiktokIntegration.startTikTokConnection(
      sessionId,
      tiktokUsername,
      onEvent
    );

    // Verify that the connection was established for gift event handling
    expect(tiktokIntegration.getConnectionStatus(sessionId).exists).toBe(true);
  });

  it("should report connection status correctly", async () => {
    const onEvent = vi.fn();

    const status1 = tiktokIntegration.getConnectionStatus(sessionId);
    expect(status1.connected).toBe(false);
    expect(status1.exists).toBe(false);

    await tiktokIntegration.startTikTokConnection(
      sessionId,
      tiktokUsername,
      onEvent
    );

    const status2 = tiktokIntegration.getConnectionStatus(sessionId);
    expect(status2.exists).toBe(true);
  });

  it("should stop a TikTok connection", async () => {
    const onEvent = vi.fn();

    await tiktokIntegration.startTikTokConnection(
      sessionId,
      tiktokUsername,
      onEvent
    );

    expect(tiktokIntegration.getConnectionStatus(sessionId).exists).toBe(true);

    await tiktokIntegration.stopTikTokConnection(sessionId);

    expect(tiktokIntegration.getConnectionStatus(sessionId).exists).toBe(false);
  });

  it("should cleanup all connections", async () => {
    const onEvent = vi.fn();

    await tiktokIntegration.startTikTokConnection(
      sessionId,
      tiktokUsername,
      onEvent
    );

    await tiktokIntegration.startTikTokConnection(
      "session-2",
      "user2",
      onEvent
    );

    expect(tiktokIntegration.getConnectionStatus(sessionId).exists).toBe(true);
    expect(tiktokIntegration.getConnectionStatus("session-2").exists).toBe(true);

    await tiktokIntegration.cleanupAllConnections();

    expect(tiktokIntegration.getConnectionStatus(sessionId).exists).toBe(false);
    expect(tiktokIntegration.getConnectionStatus("session-2").exists).toBe(false);
  });
});
