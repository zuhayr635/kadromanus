import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getBroadcasterSession } from "./broadcaster-session";
import { getGameState } from "./game-engine";

interface GameEvent {
  type: "cardOpened" | "playerAdded" | "gameStarted" | "gameEnded" | "statsUpdated" | "modeChanged";
  sessionId: string;
  data: any;
  timestamp: number;
}

class SocketServer {
  private io: SocketIOServer;
  private sessionSockets: Map<string, Set<string>> = new Map();
  private socketSessions: Map<string, string> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[Socket.io] Yeni bağlantı: ${socket.id}`);

      // Oturum katılma
      socket.on("joinSession", (sessionId: string) => {
        console.log(`[Socket.io] Socket ${socket.id} oturuma katılıyor: ${sessionId}`);
        
        socket.join(`session:${sessionId}`);
        this.socketSessions.set(socket.id, sessionId);

        if (!this.sessionSockets.has(sessionId)) {
          this.sessionSockets.set(sessionId, new Set());
        }
        this.sessionSockets.get(sessionId)!.add(socket.id);

        // Mevcut oyun durumunu gönder
        const gameState = getGameState(sessionId);
        socket.emit("gameStateUpdate", gameState);

        // Diğer istemcilere katılımı bildir
        socket.to(`session:${sessionId}`).emit("participantJoined", {
          socketId: socket.id,
          timestamp: Date.now(),
        });
      });

      // Oturumdan ayrılma
      socket.on("leaveSession", (sessionId: string) => {
        console.log(`[Socket.io] Socket ${socket.id} oturumdan ayrılıyor: ${sessionId}`);
        
        socket.leave(`session:${sessionId}`);
        this.socketSessions.delete(socket.id);

        const sockets = this.sessionSockets.get(sessionId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.sessionSockets.delete(sessionId);
          }
        }

        socket.to(`session:${sessionId}`).emit("participantLeft", {
          socketId: socket.id,
          timestamp: Date.now(),
        });
      });

      // Bağlantı kesilme
      socket.on("disconnect", () => {
        console.log(`[Socket.io] Bağlantı kesildi: ${socket.id}`);
        
        const sessionId = this.socketSessions.get(socket.id);
        if (sessionId) {
          const sockets = this.sessionSockets.get(sessionId);
          if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.sessionSockets.delete(sessionId);
            }
          }
          this.socketSessions.delete(socket.id);
        }
      });

      // Hata yönetimi
      socket.on("error", (error: any) => {
        console.error(`[Socket.io] Hata (${socket.id}):`, error);
      });
    });
  }

  // Oyun event'i yayınla
  public broadcastGameEvent(event: GameEvent) {
    const room = `session:${event.sessionId}`;
    console.log(`[Socket.io] Event yayınlanıyor (${room}):`, event.type);
    
    this.io.to(room).emit("gameEvent", event);
  }

  // Kart açma event'i
  public broadcastCardOpened(sessionId: string, card: any) {
    this.broadcastGameEvent({
      type: "cardOpened",
      sessionId,
      data: card,
      timestamp: Date.now(),
    });
  }

  // Oyuncu ekleme event'i
  public broadcastPlayerAdded(sessionId: string, player: any, teamIndex: number) {
    this.broadcastGameEvent({
      type: "playerAdded",
      sessionId,
      data: { player, teamIndex },
      timestamp: Date.now(),
    });
  }

  // Oyun başlama event'i
  public broadcastGameStarted(sessionId: string, gameState: any) {
    this.broadcastGameEvent({
      type: "gameStarted",
      sessionId,
      data: gameState,
      timestamp: Date.now(),
    });
  }

  // Oyun bitme event'i
  public broadcastGameEnded(sessionId: string, finalScores: any) {
    this.broadcastGameEvent({
      type: "gameEnded",
      sessionId,
      data: finalScores,
      timestamp: Date.now(),
    });
  }

  // İstatistik güncelleme event'i
  public broadcastStatsUpdated(sessionId: string, stats: any) {
    this.broadcastGameEvent({
      type: "statsUpdated",
      sessionId,
      data: stats,
      timestamp: Date.now(),
    });
  }

  // Mod değişikliği event'i
  public broadcastModeChanged(sessionId: string, mode: "manual" | "automatic") {
    this.broadcastGameEvent({
      type: "modeChanged",
      sessionId,
      data: { mode },
      timestamp: Date.now(),
    });
  }

  // Oturumdaki istemci sayısı
  public getSessionClientCount(sessionId: string): number {
    const sockets = this.sessionSockets.get(sessionId);
    return sockets ? sockets.size : 0;
  }

  // Socket.io sunucusunu al
  public getIO(): SocketIOServer {
    return this.io;
  }
}

let socketServer: SocketServer | null = null;

export function initializeSocketServer(httpServer: HTTPServer): SocketServer {
  if (!socketServer) {
    socketServer = new SocketServer(httpServer);
  }
  return socketServer;
}

export function getSocketServer(): SocketServer | null {
  return socketServer;
}

export type { GameEvent };
