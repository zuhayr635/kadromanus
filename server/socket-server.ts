import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getBroadcasterSession } from "./broadcaster-session";
import {
  initializeGame,
  getGameState,
  processGiftEvent,
  processLikeEvent,
  confirmPendingCard,
  isGameComplete,
  endGame,
  cleanupGame,
} from "./game-engine";
import type { GameState, PendingCard } from "./game-engine";
import { getDb } from "./db";
import { sessions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  startTikTokConnection,
  stopTikTokConnection,
} from "./tiktok-integration";
import { screenshotAndSend } from "./screenshot-service";

type TikTokEvent = {
  type: "like" | "gift" | "comment" | "connected" | "disconnected" | "error";
  data: Record<string, unknown>;
  timestamp: number;
};

interface GameEvent {
  type: "cardOpened" | "playerAdded" | "gameStarted" | "gameEnded" | "statsUpdated" | "modeChanged" | "pendingCard" | "cardRevealed";
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

      // Gift config güncelleme (broadcaster'dan gelir)
      socket.on("gift-config-update", async (data: { sessionId: string; activeGiftIds: number[] }) => {
        try {
          const { sessionId, activeGiftIds } = data;
          const db = await getDb();

          if (!db) {
            console.warn(`[${sessionId}] Gift config update: DB unavailable`);
            return;
          }

          // Session'ın giftConfig'ini güncelle
          await db.update(sessions)
            .set({ giftConfig: { activeGiftIds } })
            .where(eq(sessions.sessionId, sessionId));

          // Session'daki tüm client'lara broadcast et
          this.io.to(`session:${sessionId}`).emit("gift-config-updated", { activeGiftIds });

          console.log(`[${sessionId}] Gift config güncellendi: ${activeGiftIds.length} aktif hediye`);
        } catch (err) {
          console.error("Gift config update hatası:", err);
        }
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

  // Bekleyen kart event'i (takım seçimi bekleniyor)
  public broadcastPendingCard(sessionId: string, pending: PendingCard, teams: { id: number; name: string }[]) {
    this.broadcastGameEvent({
      type: "pendingCard",
      sessionId,
      data: { pending, teams },
      timestamp: Date.now(),
    });
  }

  // Kart açıldı event'i (takım seçimi yapıldı)
  public broadcastCardRevealed(sessionId: string, card: any, teamName: string) {
    this.broadcastGameEvent({
      type: "cardRevealed",
      sessionId,
      data: { card, teamName },
      timestamp: Date.now(),
    });
  }

  // Bekleyen kartı onayla: takıma ata, cardRevealed yayınla
  public async assignPendingCard(sessionId: string, teamId: number): Promise<boolean> {
    const gameState = getGameState(sessionId);
    if (!gameState) return false;

    const card = await confirmPendingCard(sessionId, teamId);
    if (!card) return false;

    const teamName = gameState.teams[teamId]?.name ?? "";
    this.broadcastCardRevealed(sessionId, card, teamName);
    this.broadcastStatsUpdated(sessionId, this.serializeStats(sessionId));

    if (isGameComplete(sessionId)) {
      await this.stopSession(sessionId);
    }
    return true;
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

  // Oturum başlat: game-engine'i hazırla, TikTok bağlantısı aç, gameStarted yayınla
  async startSession(sessionId: string, tiktokUsername: string, teamNames: string[]) {
    initializeGame(sessionId, teamNames);

    // TikTok bağlantısı — başarısız olursa demo/simülasyon modunda devam et
    try {
      await startTikTokConnection(sessionId, tiktokUsername, (event) =>
        this.handleTikTokEvent(sessionId, event)
      );
    } catch (err) {
      console.warn(`[${sessionId}] ⚠️ TikTok bağlantısı başarısız, DEMO modunda devam ediyor`);
      console.warn(`[${sessionId}] Hata:`, err instanceof Error ? err.message : err);
      // Demo mode: Simüle edilmiş TikTok event'leri gönder
      this.startDemoMode(sessionId);
    }

    this.broadcastGameStarted(sessionId, getGameState(sessionId));
  }

  // Demo modu: TikTok erişilemezken simülasyon event'leri gönder
  private startDemoMode(sessionId: string) {
    console.log(`[${sessionId}] 🎮 DEMO MODE aktif — Her 5 saniyede simüle edilmiş hediye/beğeni`);

    const mockUsers = ["@demo_ali", "@demo_veli", "@demo_ayse", "@demo_fatma", "@demo_mehmet"];
    const mockGifts: Array<{ name: string; diamonds: number }> = [
      { name: "Rose", diamonds: 1 },
      { name: "TikTok", diamonds: 1 },
      { name: "GG", diamonds: 10 },
      { name: "Ice Cream Cone", diamonds: 25 },
      { name: "Drama Queen", diamonds: 200 },
      { name: "Lion", diamonds: 500 },
    ];

    const interval = setInterval(() => {
      const gameState = getGameState(sessionId);
      if (!gameState) {
        clearInterval(interval);
        return;
      }

      const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const roll = Math.random();

      if (roll < 0.4) {
        // Like event (40% chance)
        const likeCount = Math.floor(Math.random() * 200) + 50;
        this.handleTikTokEvent(sessionId, {
          type: "like",
          data: { username: user, likeCount },
          timestamp: Date.now(),
        });
      } else {
        // Gift event (60% chance)
        const gift = mockGifts[Math.floor(Math.random() * mockGifts.length)];
        this.handleTikTokEvent(sessionId, {
          type: "gift",
          data: {
            username: user,
            giftName: gift.name,
            diamondCount: gift.diamonds,
          },
          timestamp: Date.now(),
        });
      }
    }, 5000); // Her 5 saniyede bir

    // Cleanup interval when session stops
    this.demoIntervals = this.demoIntervals || new Map();
    this.demoIntervals.set(sessionId, interval);
  }

  private demoIntervals: Map<string, NodeJS.Timeout> | undefined;

  // Oturum durdur: TikTok bağlantısını kapat, oyunu bitir, yayınla, temizle
  async stopSession(sessionId: string) {
    await stopTikTokConnection(sessionId);

    // Demo mod interval temizle
    if (this.demoIntervals?.has(sessionId)) {
      clearInterval(this.demoIntervals.get(sessionId)!);
      this.demoIntervals.delete(sessionId);
    }

    const result = endGame(sessionId);

    if (result) {
      this.broadcastGameEnded(sessionId, {
        finalScores: result.finalScores,
        statistics: result.statistics,
      });

      // Fire-and-forget screenshot — does not block cleanup
      const session = getBroadcasterSession(sessionId);
      if (session) {
        void screenshotAndSend(
          {
            sessionId,
            tiktokUsername: session.tiktokUsername,
            finalScores: result.finalScores,
            statistics: result.statistics,
          },
          process.env.TELEGRAM_GROUP_CHAT_ID
        );
      }
    }

    cleanupGame(sessionId);
  }

  // TikTok event yönlendiricisi
  private async handleTikTokEvent(sessionId: string, event: TikTokEvent) {
    const gameState = getGameState(sessionId);
    if (!gameState) return;

    switch (event.type) {
      case "gift": {
        const pending = await processGiftEvent(
          sessionId,
          event.data.giftName as string,
          event.data.diamondCount as number,
          event.data.username as string
        );
        if (pending) {
          this.broadcastPendingCard(sessionId, pending, gameState.teams.map(t => ({ id: t.id, name: t.name })));
        }
        this.broadcastStatsUpdated(sessionId, this.serializeStats(sessionId));
        break;
      }
      case "like": {
        const pending = await processLikeEvent(
          sessionId,
          event.data.username as string,
          event.data.likeCount as number
        );
        if (pending) {
          this.broadcastPendingCard(sessionId, pending, gameState.teams.map(t => ({ id: t.id, name: t.name })));
        }
        this.broadcastStatsUpdated(sessionId, this.serializeStats(sessionId));
        break;
      }
      case "comment": {
        // Altyapı kurulu; !1-!4 parsing hazır ama UI bağlantısı sonraki sprint
        const comment = event.data.comment as string;
        if (/^![1-4]$/.test(comment)) {
          // TODO: auto-mod aktifse teamId bu komuttan alınacak
        }
        break;
      }
      case "connected":
        this.broadcastStatsUpdated(sessionId, { tiktokConnected: true });
        break;
      case "disconnected":
        this.broadcastStatsUpdated(sessionId, {
          tiktokConnected: false,
          reason: event.data.reason,
        });
        break;
      case "error":
        console.error(`[${sessionId}] TikTok hatası:`, event.data);
        break;
    }
  }

  // En az oyuncuya sahip takım indeksini döndürür (round-robin denge)
  private getLeastFilledTeamId(gameState: GameState): number {
    return gameState.teams.reduce(
      (minIdx, team, i, arr) =>
        team.players.length < arr[minIdx].players.length ? i : minIdx,
      0
    );
  }

  // GameState'i JSON-serializable stats nesnesine dönüştür
  private serializeStats(sessionId: string) {
    const state = getGameState(sessionId);
    if (!state) return {};
    return {
      cardsOpened: state.openedCards.length,
      participants: state.participants.size,
      totalLikes: state.totalLikes,
      totalGifts: state.totalGifts,
    };
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

export async function startSession(
  sessionId: string,
  tiktokUsername: string,
  teamNames: string[]
): Promise<void> {
  return socketServer?.startSession(sessionId, tiktokUsername, teamNames);
}

export async function stopSession(sessionId: string): Promise<void> {
  return socketServer?.stopSession(sessionId);
}

export async function assignPendingCard(sessionId: string, teamId: number): Promise<boolean> {
  return socketServer?.assignPendingCard(sessionId, teamId) ?? false;
}

export type { GameEvent };
