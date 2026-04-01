# Real-Time Altyapı — Tasarım Belgesi

**Tarih:** 2026-04-02
**Proje:** Kadrokur v3
**Konu:** Socket.io entegrasyonu, TikTok→Oyun Motoru pipeline, WebSocket istemci entegrasyonu
**Durum:** v2 — Kod incelemesi sonrası güncellendi

---

## 1. Bağlam ve Hedef

Kadrokur v3'te oyun mekaniği (`game-engine.ts`), TikTok entegrasyonu (`tiktok-integration.ts`) ve Socket.io altyapısı (`socket-server.ts`) ayrı ayrı yazılmış ancak birbirine bağlanmamıştır. Bu tasarım bu üç modülü birleştiren wire-up çalışmasını tanımlar.

**Kapsam:**
- `server/_core/index.ts`'de `initializeSocketServer()` çağrısı eklemek
- `socket-server.ts`'i TikTok event pipeline'ı ile genişletmek
- `broadcaster.ts` router'ından `startSession`/`stopSession` çağrıları
- `BroadcasterPanel.tsx`'e `socket.io-client` eklemek
- `game-screen-websocket.html`'de sunucu tarafını aktif etmek

---

## 2. Mimari

### 2.1 Genel Akış

```
TikTok LIVE
  ↓ gift/like/comment
tiktok-integration.ts
  startTikTokConnection(sessionId, username, onEvent callback)
  ↓ onEvent(TikTokEvent)
socket-server.ts (SocketServer sınıfı — MERKEZ HUB)
  ├─→ game-engine.ts (processGiftEvent / processLikeEvent / processTeamSelectionCommand)
  │     ↓ openCard() / getGiftTier() / initializeGame()
  └─→ io.to(`session:${sessionId}`).emit("gameEvent", ...)
          ↙                          ↘
game-screen-websocket.html      BroadcasterPanel.tsx
```

### 2.2 socket-server.ts Sorumlulukları

`SocketServer` sınıfı şu yeni yöntemleri alır:

| Yöntem | Açıklama |
|--------|----------|
| `startSession(sessionId, username, teamNames)` | `initializeGame()` çağırır → `startTikTokConnection()` başlatır |
| `stopSession(sessionId)` | `stopTikTokConnection()` çağırır → `endGame()` → yayınlar |
| `handleTikTokEvent(sessionId, event)` | private — event tipine göre game-engine yönlendirir |
| `broadcastGameEvent(event)` | mevcut — Socket.io odasına yayar |

TikTok bağlantı yönetimi `tiktok-integration.ts`'e delege edilir (`startTikTokConnection` / `stopTikTokConnection`). socket-server.ts ikinci bir Map tutmaz.

### 2.3 Oturum Başlatma Akışı

```
broadcaster.ts (tRPC createSession)
  │
  ├─ 1. broadcaster-session.ts → createBroadcasterSession() → DB'ye kaydet
  │
  └─ 2. socketServer.startSession(sessionId, username, teamNames)
           ├─ game-engine.initializeGame(sessionId, teamNames)
           └─ tiktok-integration.startTikTokConnection(sessionId, username, onEvent)
                  ↓ her event geldiğinde
              handleTikTokEvent(sessionId, event)
```

### 2.4 Oturum Sonlandırma Akışı

```
broadcaster.ts (tRPC endSession)
  │
  ├─ 1. socketServer.stopSession(sessionId)
  │      ├─ tiktok-integration.stopTikTokConnection(sessionId)
  │      ├─ game-engine.endGame(sessionId) → finalScores
  │      ├─ io.to(`session:${sessionId}`).emit("gameEvent", { type: "gameEnded", ... })
  │      └─ game-engine.cleanupGame(sessionId)
  │
  └─ 2. broadcaster-session.ts → endBroadcasterSession() → DB güncelle
```

### 2.5 Socket.io Oda Yapısı

Mevcut kodla tutarlı: `session:${sessionId}` formatı.

```ts
socket.join(`session:${sessionId}`)              // istemci katılır
io.to(`session:${sessionId}`).emit("gameEvent", data)  // sunucu yayar
```

---

## 3. Değiştirilecek Dosyalar

### 3.1 `server/_core/index.ts`

**Değişiklik:** `app.listen()` yerine `http.createServer()` + `initializeSocketServer()` çağrısı.

```ts
import { createServer } from "http";
import { initializeSocketServer } from "../socket-server";

const httpServer = createServer(app);
initializeSocketServer(httpServer);           // mevcut fonksiyon, sadece çağrılmıyor
httpServer.listen(PORT, ...);
```

`initializeSocketServer()` zaten `socket-server.ts`'de mevcut (satır 184). Sadece çağrısı eksik.

### 3.2 `server/socket-server.ts`

`SocketServer` sınıfına eklenecek yöntemler:

```ts
// Oturum başlat
async startSession(sessionId: string, tiktokUsername: string, teamNames: string[]) {
  initializeGame(sessionId, teamNames);
  await startTikTokConnection(sessionId, tiktokUsername, (event) =>
    this.handleTikTokEvent(sessionId, event)
  );
  this.broadcastGameStarted(sessionId, getGameState(sessionId));
}

// Oturum durdur
async stopSession(sessionId: string) {
  await stopTikTokConnection(sessionId);  // Callback garantisi: resolve sonrası event gelmez
  const result = endGame(sessionId);
  if (result) {
    this.broadcastGameEnded(sessionId, { finalScores: result.finalScores, statistics: result.statistics });
  }
  cleanupGame(sessionId);
}

// TikTok event yönlendirici
private async handleTikTokEvent(sessionId: string, event: TikTokEvent) {
  const gameState = getGameState(sessionId);
  if (!gameState) return;

  switch (event.type) {
    case "gift": {
      // Hediyeler her zaman en az oyuncuya sahip takıma gider (round-robin dengesi)
      const teamId = this.getLeastFilledTeamId(gameState);
      const card = await processGiftEvent(
        sessionId, teamId,
        event.data.giftName as string,
        event.data.diamondCount as number,
        event.data.username as string
      );
      if (card) {
        this.broadcastCardOpened(sessionId, card);
        this.broadcastStatsUpdated(sessionId, getGameState(sessionId));
        if (isGameComplete(sessionId)) {
          await this.stopSession(sessionId);
          return;  // Callback re-entrance önleme: oyun bitti, daha fazla event işleme
        }
      }
      break;
    }
    case "like": {
      // Beğeniler de en az oyuncuya sahip takıma gider
      const teamId = this.getLeastFilledTeamId(gameState);
      const card = await processLikeEvent(
        sessionId, teamId,
        event.data.username as string,
        event.data.likeCount as number
      );
      if (card) {
        this.broadcastCardOpened(sessionId, card);
        this.broadcastStatsUpdated(sessionId, getGameState(sessionId));
        if (isGameComplete(sessionId)) {
          await this.stopSession(sessionId);
          return;
        }
      } else {
        this.broadcastStatsUpdated(sessionId, getGameState(sessionId));
      }
      break;
    }
    case "comment": {
      // Otomatik mod: !1-!4 komutu takım seçimi için işlenir
      // processTeamSelectionCommand() broadcaster-session.ts'te mevcut
      // Bu sprintte altyapı kurulur; manual/auto mod entegrasyonu ayrı sprint
      const comment = event.data.comment as string;
      if (/^![1-4]$/.test(comment)) {
        // TODO: auto-mod aktifse teamId'yi bu komuttan al
      }
      break;
    }
    case "connected":
      this.broadcastStatsUpdated(sessionId, { tiktokConnected: true } as any);
      break;
    case "disconnected":
      this.broadcastStatsUpdated(sessionId, { tiktokConnected: false, reason: event.data.reason } as any);
      break;
    case "error":
      // Hata sadece loglanır; tiktok-live-connector dahili retry yapar
      console.error(`[${sessionId}] TikTok hatası:`, event.data);
      break;
  }
}

// En az oyuncuya sahip takım (0-indexed) — round-robin denge stratejisi
private getLeastFilledTeamId(gameState: GameState): number {
  return gameState.teams.reduce(
    (minIdx, team, i, arr) => team.players.length < arr[minIdx].players.length ? i : minIdx,
    0
  );
}
```

`startSession` ve `stopSession` dışa aktarılır:

```ts
export async function startSession(...) { return socketServer?.startSession(...); }
export async function stopSession(...) { return socketServer?.stopSession(...); }
```

### 3.3 `server/routers/broadcaster.ts`

```ts
import { startSession, stopSession } from "../socket-server";

// createSession handler'ında:
const session = await createBroadcasterSession(...);
await startSession(session.sessionId, tiktokUsername, teamNames);

// endSession handler'ında:
await stopSession(sessionId);
await endBroadcasterSession(sessionId);
```

### 3.4 `client/src/pages/BroadcasterPanel.tsx`

```ts
import { io, Socket } from "socket.io-client";

// Hook olarak:
const [socket, setSocket] = useState<Socket | null>(null);
useEffect(() => {
  const s = io();
  s.emit("joinSession", sessionId);
  s.on("gameEvent", (event: GameEvent) => {
    if (event.sessionId !== sessionId) return;
    switch (event.type) {
      case "cardOpened": /* kart animasyonu */ break;
      case "gameEnded": /* son skor */ break;
      case "statsUpdated": /* istatistikler */ break;
    }
  });
  setSocket(s);
  return () => { s.disconnect(); };
}, [sessionId]);
```

### 3.5 `client/public/game-screen-websocket.html`

Mevcut Socket.io client kodu doğrulanacak: `joinSession` event adı ve `session:${sessionId}` oda formatı ile uyumlu mu kontrol edilecek. Muhtemelen yalnızca event adı düzeltmesi gerekecek.

---

## 4. Socket.io Event Sözleşmesi

### İstemci → Sunucu

| Event | Payload | Açıklama |
|-------|---------|----------|
| `joinSession` | `sessionId: string` | Oyun odasına katıl |
| `leaveSession` | `sessionId: string` | Oyun odasından ayrıl |

### Sunucu → İstemci (`gameEvent` sarmalayıcısı)

Tüm server→client eventler mevcut `GameEvent` yapısını kullanır:

```ts
interface GameEvent {
  type: "cardOpened" | "playerAdded" | "gameStarted" | "gameEnded" | "statsUpdated" | "modeChanged";
  sessionId: string;
  data: any;
  timestamp: number;
}
```

| `type` | `data` içeriği | Tetikleyici |
|--------|----------------|-------------|
| `gameStarted` | `GameState` | `startSession()` |
| `cardOpened` | `OpenedCard` | Hediye/beğeni → kart açıldı |
| `gameEnded` | `{ finalScores: Array<{teamName, score, players}>, statistics: {totalCardsOpened, totalParticipants, durationSeconds} }` | 44 kart tamamlandı |
| `statsUpdated` | `GameState \| { tiktokConnected, reason? }` | Beğeni / TikTok bağlantı değişimi |
| `modeChanged` | `{ mode: "manual" \| "automatic" }` | Mod değişimi |

---

## 5. Hata Yönetimi

- **TikTok bağlantı kesilmesi:** `statsUpdated` eventi ile `{ tiktokConnected: false, reason }` gönderilir. `tiktok-live-connector` dahili retry yapar — ekstra mekanizma gerekmez.
- **startTikTokConnection() başarısız olursa:** Hata fırlatılır, broadcaster.ts try-catch ile yakalar, DB'de oturum `error` statüsüne güncellenir, `cleanupGame(sessionId)` çağrılır.
- **Game engine hatası (null döndürme):** `openCard()` null dönerse sessizce loglanır, broadcast yapılmaz.
- **Geçersiz sessionId ile `joinSession`:** Socket odasına katılır ama `gameStateUpdate` boş gelir (mevcut davranış korunur).
- **Oyun bitmeden `stopSession`:** `endGame()` null dönebilir — null guard mevcuttur.
- **Concurrent event / re-entrance:** `stopSession()` içinde `stopTikTokConnection()` await edildikten sonra callback garantisi sağlanır. Oyun tamamlandığında `handleTikTokEvent` erken `return` ile çıkar.

### Bağımlılık Notu

`socket.io-client` client package'ına eklenmesi gerekiyor:
```bash
pnpm add socket.io-client
```

---

## 6. Test Stratejisi

Mevcut test dosyaları (`server/socket-server.test.ts`, `server/tiktok-integration.test.ts`, `server/game-engine.test.ts`) yeni `startSession`/`stopSession` API için güncellenir.

| Senaryo | Doğrulama |
|---------|-----------|
| `startSession` çağrısı | `initializeGame` çağrıldı mı, TikTok bağlantısı başladı mı |
| Gift eventi | `processGiftEvent` çağrıldı mı, `cardOpened` eventi yayınlandı mı |
| 100 beğeni | Bronze kart açıldı mı |
| 44. kart | `isGameComplete` true, `stopSession` tetiklendi mi |
| `stopSession` | TikTok bağlantısı temizlendi mi, `gameEnded` yayınlandı mı |

---

## 7. Kapsam Dışı

- Puppeteer screenshot
- Admin JWT auth
- Oyuncu değiştirme (substitution)
- Telegram webhook
- Leaderboard
- Manuel mod takım seçimi UI'ı (comment `!1-!4` parsing altyapısı eklenir ama UI bağlantısı ayrı sprint)
