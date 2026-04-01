vi.mock("./game-engine", () => ({
  initializeGame: vi.fn(),
  getGameState: vi.fn(),
  processGiftEvent: vi.fn(),
  processLikeEvent: vi.fn(),
  isGameComplete: vi.fn().mockReturnValue(false),
  endGame: vi.fn().mockReturnValue(null),
  cleanupGame: vi.fn(),
}));

vi.mock("./tiktok-integration", () => ({
  startTikTokConnection: vi.fn().mockResolvedValue(undefined),
  stopTikTokConnection: vi.fn().mockResolvedValue(undefined),
}));

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import { Server as HTTPServer } from "http";
import { createServer } from "http";
import { getSocketServer } from "./socket-server";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

describe("Socket.io Server", () => {
  let httpServer: HTTPServer;
  let socketServer: any;
  let clientSocket: ClientSocket;
  let sharedHttpServer: HTTPServer | null = null;

  beforeEach(async () => {
    // Create shared HTTP server on first test
    if (!sharedHttpServer) {
      const { initializeSocketServer } = await import("./socket-server");
      sharedHttpServer = createServer();
      socketServer = initializeSocketServer(sharedHttpServer);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Server init timeout"));
        }, 5000);

        sharedHttpServer!.listen(0, () => {
          clearTimeout(timeout);
          resolve();
        });

        sharedHttpServer!.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }

    // Create fresh client socket for each test
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Client connect timeout"));
      }, 5000);

      const port = (sharedHttpServer!.address() as any).port;
      clientSocket = ioClient(`http://localhost:${port}`, {
        reconnection: false,
        transports: ["websocket"],
      });

      clientSocket.on("connect", () => {
        clearTimeout(timeout);
        resolve();
      });

      clientSocket.on("connect_error", (err) => {
        clearTimeout(timeout);
        reject(new Error(`Socket connection failed: ${err}`));
      });
    });
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.removeAllListeners();
      clientSocket.disconnect();
    }
  });

  afterAll(async () => {
    if (socketServer) {
      try {
        socketServer.getIO().removeAllListeners();
        socketServer.getIO().disconnectSockets();
      } catch (e) {
        // Ignore
      }
    }

    if (sharedHttpServer) {
      return new Promise<void>((resolve) => {
        sharedHttpServer!.close(() => resolve());
      });
    }
  });

  it("should connect to socket server", () => {
    expect(clientSocket.connected).toBe(true);
  });

  it("should join a session", async () => {
    const sessionId = "test-session-1";
    
    clientSocket.emit("joinSession", sessionId);
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(socketServer.getSessionClientCount(sessionId)).toBe(1);
  });

  it("should broadcast card opened event", async () => {
    const sessionId = "test-session-2";
    
    clientSocket.emit("joinSession", sessionId);
    
    return new Promise<void>((resolve) => {
      clientSocket.on("gameEvent", (event: any) => {
        expect(event.type).toBe("cardOpened");
        expect(event.data.name).toBe("Test Player");
        resolve();
      });

      setTimeout(() => {
        socketServer.broadcastCardOpened(sessionId, {
          name: "Test Player",
          cardQuality: "Gold",
        });
      }, 100);
    });
  });

  it("should broadcast player added event", async () => {
    const sessionId = "test-session-3";
    
    clientSocket.emit("joinSession", sessionId);
    
    return new Promise<void>((resolve) => {
      clientSocket.on("gameEvent", (event: any) => {
        expect(event.type).toBe("playerAdded");
        expect(event.data.teamIndex).toBe(0);
        resolve();
      });

      setTimeout(() => {
        socketServer.broadcastPlayerAdded(sessionId, { name: "Player 1" }, 0);
      }, 100);
    });
  });

  it("should broadcast game started event", async () => {
    const sessionId = "test-session-4";
    
    clientSocket.emit("joinSession", sessionId);
    
    return new Promise<void>((resolve) => {
      clientSocket.on("gameEvent", (event: any) => {
        expect(event.type).toBe("gameStarted");
        expect(event.data.status).toBe("active");
        resolve();
      });

      setTimeout(() => {
        socketServer.broadcastGameStarted(sessionId, { status: "active" });
      }, 100);
    });
  });

  it("should broadcast game ended event", async () => {
    const sessionId = "test-session-5";
    
    clientSocket.emit("joinSession", sessionId);
    
    return new Promise<void>((resolve) => {
      clientSocket.on("gameEvent", (event: any) => {
        expect(event.type).toBe("gameEnded");
        expect(event.data.winner).toBe("Team 1");
        resolve();
      });

      setTimeout(() => {
        socketServer.broadcastGameEnded(sessionId, { winner: "Team 1" });
      }, 100);
    });
  });

  it("should broadcast stats updated event", async () => {
    const sessionId = "test-session-6";
    
    clientSocket.emit("joinSession", sessionId);
    
    return new Promise<void>((resolve) => {
      clientSocket.on("gameEvent", (event: any) => {
        expect(event.type).toBe("statsUpdated");
        expect(event.data.cardsOpened).toBe(5);
        resolve();
      });

      setTimeout(() => {
        socketServer.broadcastStatsUpdated(sessionId, { cardsOpened: 5 });
      }, 100);
    });
  });

  it("should broadcast mode changed event", async () => {
    const sessionId = "test-session-7";
    
    clientSocket.emit("joinSession", sessionId);
    
    return new Promise<void>((resolve) => {
      clientSocket.on("gameEvent", (event: any) => {
        expect(event.type).toBe("modeChanged");
        expect(event.data.mode).toBe("automatic");
        resolve();
      });

      setTimeout(() => {
        socketServer.broadcastModeChanged(sessionId, "automatic");
      }, 100);
    });
  });

  it("should handle leave session", async () => {
    const sessionId = "test-session-8";
    
    clientSocket.emit("joinSession", sessionId);
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(socketServer.getSessionClientCount(sessionId)).toBe(1);
    
    clientSocket.emit("leaveSession", sessionId);
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(socketServer.getSessionClientCount(sessionId)).toBe(0);
  });

  it("should isolate sessions", async () => {
    const sessionId1 = "test-session-10";
    const sessionId2 = "test-session-11";
    
    clientSocket.emit("joinSession", sessionId1);
    
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(socketServer.getSessionClientCount(sessionId1)).toBe(1);
    expect(socketServer.getSessionClientCount(sessionId2)).toBe(0);
  });

  it("should return socket server instance", () => {
    const server = getSocketServer();
    expect(server).not.toBeNull();
    expect(server?.getIO()).toBeDefined();
  });
});

describe("SocketServer — Session Lifecycle", () => {
  it("startSession: initializeGame ve startTikTokConnection çağrılır", async () => {
    const { initializeGame, getGameState } = await import("./game-engine");
    const { startTikTokConnection } = await import("./tiktok-integration");

    vi.mocked(initializeGame).mockReturnValue(undefined as any);
    vi.mocked(getGameState).mockReturnValue({
      sessionId: "s1",
      teams: [{ id: 0, name: "T1", players: [], score: 0 }],
      openedCards: [],
      totalLikes: 0,
      totalGifts: 0,
      participants: new Set<string>(),
      startedAt: Date.now(),
    } as any);
    vi.mocked(startTikTokConnection).mockResolvedValue(undefined);

    const { getSocketServer } = await import("./socket-server");
    const srv = getSocketServer();
    if (!srv) throw new Error("socketServer not initialized");

    await srv.startSession("s1", "testuser", ["T1", "T2", "T3", "T4"]);

    expect(initializeGame).toHaveBeenCalledWith("s1", ["T1", "T2", "T3", "T4"]);
    expect(startTikTokConnection).toHaveBeenCalledWith("s1", "testuser", expect.any(Function));
  });

  it("stopSession: stopTikTokConnection ve endGame çağrılır", async () => {
    const { endGame, cleanupGame } = await import("./game-engine");
    const { stopTikTokConnection } = await import("./tiktok-integration");

    vi.mocked(stopTikTokConnection).mockResolvedValue(undefined);
    vi.mocked(endGame).mockReturnValue({
      finalScores: [{ teamName: "T1", score: 10, players: 11 }],
      statistics: { totalCardsOpened: 44, totalParticipants: 20, durationSeconds: 300 },
    } as any);
    vi.mocked(cleanupGame).mockReturnValue(undefined);

    const { getSocketServer } = await import("./socket-server");
    const srv = getSocketServer();
    if (!srv) throw new Error("socketServer not initialized");

    await srv.stopSession("s1");

    expect(stopTikTokConnection).toHaveBeenCalledWith("s1");
    expect(endGame).toHaveBeenCalledWith("s1");
    expect(cleanupGame).toHaveBeenCalledWith("s1");
  });

  it("getLeastFilledTeamId: en az oyuncuya sahip takımı döndürür", async () => {
    const { getSocketServer } = await import("./socket-server");
    const srv = getSocketServer();
    if (!srv) throw new Error("socketServer not initialized");

    const gameState = {
      teams: [
        { id: 0, name: "T1", players: [1, 2, 3], score: 0 },
        { id: 1, name: "T2", players: [1], score: 0 },
        { id: 2, name: "T3", players: [1, 2], score: 0 },
        { id: 3, name: "T4", players: [1, 2, 3, 4], score: 0 },
      ],
    } as any;

    // private metoda erişim
    const teamId = (srv as any).getLeastFilledTeamId(gameState);
    expect(teamId).toBe(1); // T2 en az oyuncuya sahip
  });
});
