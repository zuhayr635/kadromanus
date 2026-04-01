import { TikTokLiveConnection } from "tiktok-live-connector";
const EVENTS = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  LIKE: "like",
  GIFT: "gift",
  COMMENT: "comment",
  ERROR: "error",
};
import { EventEmitter } from "events";

interface TikTokEvent {
  type: "like" | "gift" | "comment" | "connected" | "disconnected" | "error";
  data: Record<string, unknown>;
  timestamp: number;
}

interface TikTokConnectionManager {
  connection: TikTokLiveConnection | null;
  eventEmitter: EventEmitter;
  isConnected: boolean;
}

const connections = new Map<string, TikTokConnectionManager>();

/**
 * Start TikTok Live connection for a broadcaster session
 * @param sessionId - Unique session identifier
 * @param tiktokUsername - TikTok username (without @)
 * @param onEvent - Callback function for events
 */
export async function startTikTokConnection(
  sessionId: string,
  tiktokUsername: string,
  onEvent: (event: TikTokEvent) => void
): Promise<void> {
  try {
    // Clean up existing connection if any
    if (connections.has(sessionId)) {
      await stopTikTokConnection(sessionId);
    }

    const connection = new TikTokLiveConnection(tiktokUsername);
    const eventEmitter = new EventEmitter();

    const manager: TikTokConnectionManager = {
      connection,
      eventEmitter,
      isConnected: false,
    };

    connections.set(sessionId, manager);

    // Connected event
    (connection as any).on("connected", (data: any) => {
      manager.isConnected = true;
      const event: TikTokEvent = {
        type: "connected",
        data: {
          username: tiktokUsername,
          roomId: data.roomId || null,
        },
        timestamp: Date.now(),
      };
      onEvent(event);
      console.log(`[${sessionId}] TikTok bağlantısı başarılı: ${tiktokUsername}`);
    });

    // Disconnected event
    (connection as any).on("disconnected", (reason: any) => {
      manager.isConnected = false;
      const event: TikTokEvent = {
        type: "disconnected",
        data: {
          username: tiktokUsername,
          reason: reason || "unknown",
        },
        timestamp: Date.now(),
      };
      onEvent(event);
      console.log(`[${sessionId}] TikTok bağlantısı koptu: ${reason}`);
    });

    // Like event - captures combo likes
    (connection as any).on("like", (data: any) => {
      const event: TikTokEvent = {
        type: "like",
        data: {
          userId: data.userId || data.user?.id,
          username: data.uniqueId || data.user?.uniqueId,
          displayName: data.nickname || data.user?.nickname,
          likeCount: data.likeCount || 1, // Combo sayısı
          totalLikeCount: data.totalLikeCount || data.likeCount || 1,
          profilePic: data.profilePictureUrl || data.user?.avatarLarge || "",
        },
        timestamp: Date.now(),
      };
      onEvent(event);
    });

    // Gift event - handles streakable gifts
    (connection as any).on("gift", (data: any) => {
      // Only process gift when streak ends or it's a non-streakable gift
      if (data.repeatEnd || !data.gift?.repeatable) {
        const event: TikTokEvent = {
          type: "gift",
          data: {
            userId: data.userId || data.user?.id,
            username: data.uniqueId || data.user?.uniqueId,
            displayName: data.nickname || data.user?.nickname,
            giftId: data.giftId || data.gift?.id,
            giftName: data.giftName || data.gift?.name,
            giftCount: data.repeatCount || 1,
            diamondCount: data.diamondCount || data.gift?.diamondCount || 0,
            totalValue: (data.diamondCount || 0) * (data.repeatCount || 1),
            profilePic: data.profilePictureUrl || data.user?.avatarLarge || "",
          },
          timestamp: Date.now(),
        };
        onEvent(event);
      }
    });

    // Comment event
    (connection as any).on("comment", (data: any) => {
      const event: TikTokEvent = {
        type: "comment",
        data: {
          userId: data.userId || data.user?.id,
          username: data.uniqueId || data.user?.uniqueId,
          displayName: data.nickname || data.user?.nickname,
          comment: data.comment || data.text,
          profilePic: data.profilePictureUrl || data.user?.avatarLarge || "",
        },
        timestamp: Date.now(),
      };
      onEvent(event);
    });

    // Error event
    (connection as any).on("error", (error: any) => {
      const event: TikTokEvent = {
        type: "error",
        data: {
          message: error?.message || String(error),
          code: error?.code || "unknown",
        },
        timestamp: Date.now(),
      };
      onEvent(event);
      console.error(`[${sessionId}] TikTok hatası:`, error);
    });

    // Connect to TikTok Live
    await connection.connect();
    console.log(`[${sessionId}] TikTok Live bağlantısı başlatılıyor...`);
  } catch (error) {
    console.error(`[${sessionId}] TikTok bağlantı hatası:`, error);
    const event: TikTokEvent = {
      type: "error",
      data: {
        message: error instanceof Error ? error.message : String(error),
      },
      timestamp: Date.now(),
    };
    onEvent(event);
    throw error;
  }
}

/**
 * Stop TikTok Live connection for a session
 * @param sessionId - Unique session identifier
 */
export async function stopTikTokConnection(sessionId: string): Promise<void> {
  const manager = connections.get(sessionId);
  if (manager && manager.connection) {
    try {
      await manager.connection.disconnect();
      console.log(`[${sessionId}] TikTok bağlantısı kapatıldı`);
    } catch (error) {
      console.error(`[${sessionId}] TikTok bağlantı kapatma hatası:`, error);
    }
  }
  connections.delete(sessionId);
}

/**
 * Check if a session has an active TikTok connection
 * @param sessionId - Unique session identifier
 */
export function isConnected(sessionId: string): boolean {
  const manager = connections.get(sessionId);
  return manager?.isConnected || false;
}

/**
 * Get connection status for a session
 * @param sessionId - Unique session identifier
 */
export function getConnectionStatus(sessionId: string) {
  const manager = connections.get(sessionId);
  return {
    connected: manager?.isConnected || false,
    exists: !!manager,
  };
}

/**
 * Cleanup all connections (useful for graceful shutdown)
 */
export async function cleanupAllConnections(): Promise<void> {
  const promises = Array.from(connections.keys()).map((sessionId) =>
    stopTikTokConnection(sessionId)
  );
  await Promise.all(promises);
  console.log("Tüm TikTok bağlantıları kapatıldı");
}
