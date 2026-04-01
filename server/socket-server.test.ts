import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Server as HTTPServer } from "http";
import { createServer } from "http";
import { initializeSocketServer, getSocketServer } from "./socket-server";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

describe("Socket.io Server", () => {
  let httpServer: HTTPServer;
  let socketServer: any;
  let clientSocket: ClientSocket;

  beforeEach(async () => {
    httpServer = createServer();
    socketServer = initializeSocketServer(httpServer);
    
    return new Promise<void>((resolve) => {
      httpServer.listen(() => {
        const port = (httpServer.address() as any).port;
        clientSocket = ioClient(`http://localhost:${port}`, {
          reconnection: false,
        });
        clientSocket.on("connect", () => resolve());
      });
    });
  });

  afterEach(async () => {
    return new Promise<void>((resolve) => {
      if (clientSocket) {
        clientSocket.disconnect();
      }
      if (socketServer) {
        socketServer.getIO().close();
      }
      if (httpServer) {
        httpServer.close(() => resolve());
      }
    });
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
