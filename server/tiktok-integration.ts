import { WebcastPushConnection, SignConfig } from "tiktok-live-connector";
import { EventEmitter } from "events";
import https from "https";
import http from "http";

// Optional sign API key for better reliability
if (process.env.TIKTOK_SIGN_API_KEY) {
  SignConfig.apiKey = process.env.TIKTOK_SIGN_API_KEY;
}

// ═══════════════════════════════════════════
// PROFİL RESMİ CACHE & BASE64 İNDİRME
// ═══════════════════════════════════════════
const imageCache = new Map<string, string>();

function fetchImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!url || !url.startsWith("http")) return resolve(null);

    const client = url.startsWith("https") ? https : http;

    client.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.tiktok.com/",
      }
    }, (response) => {
      // Redirect varsa takip et
      if ((response.statusCode === 301 || response.statusCode === 302) && response.headers.location) {
        return fetchImageAsBase64(response.headers.location).then(resolve);
      }
      if (response.statusCode !== 200) return resolve(null);

      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length < 100) return resolve(null); // Çok küçük = hatalı
        const contentType = response.headers["content-type"] || "image/jpeg";
        const base64 = `data:${contentType};base64,${buffer.toString("base64")}`;
        resolve(base64);
      });
    }).on("error", () => resolve(null));
  });
}

async function getProfileImage(userId: string, profileUrl: string): Promise<string | null> {
  if (!profileUrl) return null;
  if (imageCache.has(userId)) return imageCache.get(userId)!;

  const base64 = await fetchImageAsBase64(profileUrl);
  if (base64) {
    imageCache.set(userId, base64);
    // 10 dakika sonra temizle
    setTimeout(() => imageCache.delete(userId), 10 * 60 * 1000);
    console.log(`[TikTok] Profil resmi indirildi: ${userId} (${Math.round(base64.length / 1024)}KB)`);
  }
  return base64;
}

/** Kullanıcıdan profil resmi URL'sini çıkar */
function extractProfilePicUrl(user: any): string {
  return user?.profilePictureUrl ||
         user?.userDetails?.profilePictureUrls?.[0] ||
         user?.avatarMedium ||
         user?.avatarThumb ||
         user?.profilePicture?.urls?.[0] ||
         user?.profilePicture?.url?.[0] ||
         "";
}

interface TikTokEvent {
  type: "like" | "gift" | "comment" | "connected" | "disconnected" | "error";
  data: Record<string, unknown>;
  timestamp: number;
}

interface TikTokConnectionManager {
  connection: WebcastPushConnection | null;
  eventEmitter: EventEmitter;
  isConnected: boolean;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

const connections = new Map<string, TikTokConnectionManager>();

// Debug sayaçlarını sıfırla (type-safe initialization)
if (typeof globalThis._likeLogCount === 'undefined') {
  globalThis._likeLogCount = 0;
}
if (typeof globalThis._giftLogCount === 'undefined') {
  globalThis._giftLogCount = 0;
}

/**
 * Start TikTok Live connection for a broadcaster session.
 * Uses WebcastPushConnection (same approach as TikTok-Chat-Reader).
 */
export async function startTikTokConnection(
  sessionId: string,
  tiktokUsername: string,
  onEvent: (event: TikTokEvent) => void
): Promise<void> {
  // Clean up existing connection
  if (connections.has(sessionId)) {
    await stopTikTokConnection(sessionId);
  }

  const eventEmitter = new EventEmitter();
  const manager: TikTokConnectionManager = {
    connection: null,
    eventEmitter,
    isConnected: false,
  };
  connections.set(sessionId, manager);

  function createConnection(): WebcastPushConnection {
    const options: Record<string, unknown> = {
      enableExtendedGiftInfo: false,   // gift fetch API'si 403 verir, kapalı tut
      fetchRoomInfoOnConnect: false,   // ek API çağrısını atla
      connectWithUniqueId: false,      // room ID ile bağlan (Euler Pro gerektirmez)
      disableEulerFallbacks: false,    // Euler WebSocket signing kullan (ücretsiz)
    };

    if (process.env.TIKTOK_SESSION_ID) {
      options.sessionId = process.env.TIKTOK_SESSION_ID;
    }

    return new WebcastPushConnection(tiktokUsername, options as any);
  }

  async function connect(isReconnect = false): Promise<void> {
    const current = connections.get(sessionId);
    if (!current) return;

    if (isReconnect) {
      console.log(`[${sessionId}] Yeniden bağlanılıyor: ${tiktokUsername}`);
    }

    const conn = createConnection();
    current.connection = conn;

    // === CONNECTED ===
    conn.on("connected" as any, (state: any) => {
      current.isConnected = true;
      onEvent({
        type: "connected",
        data: { username: tiktokUsername, roomId: state?.roomId ?? null },
        timestamp: Date.now(),
      });
      console.log(`[${sessionId}] ✅ TikTok bağlantısı başarılı: @${tiktokUsername} (roomId: ${state?.roomId})`);
    });

    // === DISCONNECTED — auto-reconnect ===
    conn.on("disconnected" as any, (reason: any) => {
      current.isConnected = false;
      onEvent({
        type: "disconnected",
        data: { username: tiktokUsername, reason: reason ?? "unknown" },
        timestamp: Date.now(),
      });
      console.warn(`[${sessionId}] ⚠️ TikTok bağlantısı koptu: ${reason}`);

      // Reconnect after 5 seconds if session still exists
      const timer = setTimeout(() => {
        if (connections.has(sessionId)) {
          connect(true).catch((err) => {
            console.error(`[${sessionId}] Yeniden bağlanma başarısız:`, err?.message ?? err);
          });
        }
      }, 5000);
      current.reconnectTimer = timer;
    });

    // === ERROR ===
    conn.on("error" as any, (err: any) => {
      console.error(`[${sessionId}] TikTok hatası:`, err?.message ?? err);
      onEvent({
        type: "error",
        data: { message: err?.message ?? String(err), code: err?.code ?? "unknown" },
        timestamp: Date.now(),
      });
    });

    // === LIKE ===
    conn.on("like" as any, async (data: any) => {
      // DEBUG: Tüm data objesini logla (ilk 2 kez)
      if (typeof globalThis._likeLogCount === 'undefined') {
        globalThis._likeLogCount = 0;
      }
      if (globalThis._likeLogCount < 2) {
        console.log('[TikTok Like] FULL DATA OBJECT:', JSON.stringify(data, null, 2).substring(0, 3000));
        globalThis._likeLogCount++;
      }

      const userId = data.userId ?? data.user?.userId ?? data.uniqueId ?? "";
      const username = data.uniqueId ?? data.user?.uniqueId ?? "";

      // simplifyObject flatlıyor, user objesindeki propertyler data'da
      const profilePicUrl = data.profilePictureUrl ||
                           extractProfilePicUrl(data.user) ||
                           extractProfilePicUrl(data) ||
                           "";

      // Profil resmini Base64 olarak indir
      const profilePicBase64 = await getProfileImage(userId, profilePicUrl);

      // DÜZELTME: TikTok'tan gelen like sayısı
      // - data.likeCount: Bu paketteki like sayısı (genellikle 15 veya 1)
      // - data.totalLikeCount: Yayının başından bu yana toplam like sayısı
      // Doğru hesap için DELTA gerekli (bu paket kaç like getirdi?), ancak
      // TikTok API bunu sağlamıyor. Fallback: likeCount kullan (default 1)
      const likeCountForCard = data.likeCount ?? 1;

      onEvent({
        type: "like",
        data: {
          userId,
          username,
          displayName: data.user?.nickname ?? data.nickname,
          likeCount: likeCountForCard,  // Bu pakette kaç like? (genellikle 15)
          totalLikeCount: data.totalLikeCount ?? data.likeCount ?? 1,  // Yayın toplam like (info amaçlı)
          profilePic: profilePicUrl,
          profilePicBase64,
        },
        timestamp: Date.now(),
      });
    });

    // === GIFT ===
    // Only fire when streak ends (repeatEnd=1) or gift is non-streakable (giftType=1)
    conn.on("gift" as any, async (data: any) => {
      console.log('[TikTok Gift] RAW DATA:', JSON.stringify({
        giftId: data.giftId,
        giftName: data.giftDetails?.giftName || data.gift?.giftName,
        giftType: data.giftDetails?.giftType ?? data.gift?.giftType,
        repeatEnd: data.repeatEnd,
        repeatCount: data.repeatCount
      }).substring(0, 500));

      const giftType = data.giftDetails?.giftType ?? data.gift?.giftType ?? 1;
      const repeatEnd = data.repeatEnd; // number: 1 = streak ended

      console.log(`[TikTok Gift] giftType=${giftType}, repeatEnd=${repeatEnd}`);

      // Skip mid-streak events (repeatable gifts streaming)
      if (giftType !== 1 && repeatEnd !== 1) {
        console.log('[TikTok Gift] SKIPPED: mid-stream event');
        return;
      }

      const diamondCount = data.giftDetails?.diamondCount ?? data.gift?.diamondCount ?? data.diamondCount ?? 0;
      const giftName = data.giftDetails?.giftName ?? data.gift?.giftName ?? data.giftName ?? "Unknown";
      const repeatCount = data.repeatCount ?? data.comboCount ?? 1;

      // Gift resim URL'sini al (TikTok'tan gelen icon_url veya benzer)
      const giftImage = data.giftDetails?.icon_url ?? data.gift?.icon_url ?? data.giftDetails?.icon ?? data.gift?.icon ?? undefined;

      const userId = data.userId ?? data.user?.userId ?? data.uniqueId ?? "";
      const username = data.uniqueId ?? data.user?.uniqueId ?? "";

      // DEBUG: Her gift'te profil resmi logla
      console.log('[TikTok Gift] profilePictureUrl:', data.profilePictureUrl, '| data.user?.profilePictureUrl:', data.user?.profilePictureUrl, '| data.userDetails?.profilePictureUrls:', data.userDetails?.profilePictureUrls);

      // simplifyObject flatlıyor — propertyler hem data hem data.user'da olabilir
      const profilePicUrl = data.profilePictureUrl ||
                           extractProfilePicUrl(data.user) ||
                           extractProfilePicUrl(data) ||
                           "";

      // Profil resmini Base64 olarak indir
      const profilePicBase64 = await getProfileImage(userId, profilePicUrl);

      onEvent({
        type: "gift",
        data: {
          userId,
          username,
          displayName: data.user?.nickname ?? data.nickname,
          giftId: data.giftId ?? data.giftDetails?.id,
          giftName,
          giftCount: repeatCount,
          diamondCount,
          totalValue: diamondCount * repeatCount,
          profilePic: profilePicUrl,
          profilePicBase64,
          giftImage,
        },
        timestamp: Date.now(),
      });
    });

    // === CHAT (comment) — library emits "chat", not "comment" ===
    conn.on("chat" as any, async (data: any) => {
      const userId = data.user?.userId ?? data.userId;
      const username = data.user?.uniqueId ?? data.uniqueId;
      const profilePicUrl = extractProfilePicUrl(data.user);

      // Profil resmini Base64 olarak indir
      const profilePicBase64 = await getProfileImage(userId, profilePicUrl);

      onEvent({
        type: "comment",
        data: {
          userId,
          username,
          displayName: data.user?.nickname ?? data.nickname,
          comment: data.comment ?? data.text ?? "",
          profilePic: profilePicUrl,
          profilePicBase64,
        },
        timestamp: Date.now(),
      });
    });

    // === CONNECT ===
    try {
      await conn.connect();
    } catch (error: any) {
      console.error(`[${sessionId}] Bağlantı hatası:`, error?.message ?? error);

      let message: string;
      const name = error?.constructor?.name ?? "";
      const errorMsg = error?.message ?? String(error) ?? "";

      if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("getaddrinfo")) {
        message = "TikTok sunucusuna ulaşılamadı (DNS hatası). VPN kullan veya DNS'ini değiştir (8.8.8.8).";
      } else if (errorMsg.includes("ECONNREFUSED")) {
        message = "TikTok sunucusu bağlantıyı reddetti. Ağ bağlantısını kontrol et.";
      } else if (errorMsg.includes("ETIMEDOUT") || errorMsg.includes("timeout")) {
        message = "TikTok bağlantısı zaman aşımına uğradı. Ağ hızınızı kontrol edin.";
      } else if (name === "FetchIsLiveError") {
        const subErrors: Error[] = error.errors ?? [];
        const details = subErrors.map((e: any) => e.message).filter(Boolean).join(" | ");
        message = details || "Kullanıcı canlı yayında değil veya TikTok'a erişilemiyor";
      } else if (name === "UserOfflineError") {
        message = "Kullanıcı şu anda canlı yayında değil";
      } else if (errorMsg.includes("Websocket connection failed")) {
        message = "WebSocket bağlantısı başarısız. TikTok yayını aktif olmalıdır.";
      } else {
        message = errorMsg || "TikTok bağlantısı kurulamadı";
      }

      onEvent({ type: "error", data: { message }, timestamp: Date.now() });
      throw new Error(message);
    }
  }

  // Cleanup on stop
  eventEmitter.once("cleanup", () => {
    const current = connections.get(sessionId);
    if (current?.reconnectTimer) clearTimeout(current.reconnectTimer);
  });

  await connect();
}

/**
 * Stop TikTok Live connection for a session
 */
export async function stopTikTokConnection(sessionId: string): Promise<void> {
  const manager = connections.get(sessionId);
  if (manager) {
    if (manager.reconnectTimer) clearTimeout(manager.reconnectTimer);
    manager.isConnected = false;
    manager.eventEmitter.emit("cleanup");

    if (manager.connection) {
      try {
        await manager.connection.disconnect();
        console.log(`[${sessionId}] TikTok bağlantısı kapatıldı`);
      } catch {
        // ignore disconnect errors
      }
    }
  }
  connections.delete(sessionId);
}

export function isConnected(sessionId: string): boolean {
  return connections.get(sessionId)?.isConnected ?? false;
}

export function getConnectionStatus(sessionId: string) {
  const manager = connections.get(sessionId);
  return { connected: manager?.isConnected ?? false, exists: !!manager };
}

export async function cleanupAllConnections(): Promise<void> {
  await Promise.all(Array.from(connections.keys()).map((id) => stopTikTokConnection(id)));
  console.log("Tüm TikTok bağlantıları kapatıldı");
}
