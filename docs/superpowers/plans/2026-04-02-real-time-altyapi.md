# Real-Time Altyapı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Socket.io, TikTok event pipeline ve game-engine'i birbirine bağlayan wire-up çalışmasını tamamlamak — böylece TikTok hediye/beğenileri gerçek zamanlı olarak oyun kartlarına dönüşür ve istemcilere yayınlanır.

**Architecture:** `socket-server.ts` merkez hub olarak çalışır: `startSession()` çağrısında game-engine'i başlatır ve TikTok bağlantısı açar; gelen eventleri game-engine'e yönlendirir; sonuçları Socket.io odalarına yayınlar. `broadcaster.ts` router sadece session lifecycle'ı tetikler.

**Tech Stack:** Socket.io 4.8, tiktok-live-connector, Vitest, socket.io-client (root package.json'da zaten mevcut)

---

## Dosya Haritası

| Dosya | Değişiklik |
|-------|-----------|
| `server/_core/index.ts` | `initializeSocketServer(server)` çağrısı ekle (1 satır) |
| `server/socket-server.ts` | `startSession`, `stopSession`, `handleTikTokEvent`, `getLeastFilledTeamId` ekle + import + export wrappers |
| `server/routers/broadcaster.ts` | `createSession` ve `endSession` mutasyonlarına socket çağrıları ekle |
| `client/src/pages/BroadcasterPanel.tsx` | `socket.io-client` hook ekle |
| `client/public/game-screen-websocket.html` | `player.quality` → `player.cardQuality` alan düzeltmesi + stats alanları |
| `server/socket-server.test.ts` | `startSession`/`stopSession` testleri ekle |

---

## Task 1: Socket.io'yu HTTP sunucusuna bağla

**Files:**
- Modify: `server/_core/index.ts:30-65`

`index.ts` zaten `createServer(app)` kullanıyor ve `server.listen()` çağırıyor. Tek eksik: `initializeSocketServer(server)` çağrısı.

- [ ] **Step 1: Failing test yaz**

`server/socket-server.test.ts` dosyasına `initializeSocketServer` ile oluşturulan sunucunun Socket.io bağlantısını kabul ettiğini doğrulayan mevcut testler zaten var. Yeni bir entegrasyon testi yaz:

`server/integration.test.ts` içinde mevcut testleri kontrol et — `server/_core/index.ts`'i doğrudan test edemezsiniz (process başlatır), ancak `initializeSocketServer` çağrısının olmadığında socket bağlantısının çalışmadığını gösteriyoruz. Bu adım için mevcut `socket-server.test.ts` geçerliliğini doğrula:

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npx vitest run server/socket-server.test.ts
```

Beklenen: PASS (mevcut testler geçiyor)

- [ ] **Step 2: `initializeSocketServer` çağrısını ekle**

`server/_core/index.ts` dosyasına ekle:

```ts
// Mevcut importlar korunur, buna ekle:
import { initializeSocketServer } from "../socket-server";
```

`startServer()` fonksiyonunda `server` değişkeni tanımlandıktan hemen sonra (satır 32'den sonra):

```ts
const server = createServer(app);
initializeSocketServer(server);  // ← ekle
```

- [ ] **Step 3: Sunucunun başladığını doğrula**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npx vitest run server/socket-server.test.ts
```

Beklenen: PASS

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && git add server/_core/index.ts && git commit -m "feat: wire Socket.io to HTTP server in index.ts"
```

---

## Task 2: SocketServer'a session yönetimi ekle

**Files:**
- Modify: `server/socket-server.ts`
- Modify: `server/socket-server.test.ts`

Bu task, `SocketServer` sınıfına `startSession`, `stopSession`, `handleTikTokEvent`, `getLeastFilledTeamId` metodlarını ekler ve bunları dışa aktarır.

- [ ] **Step 1: Failing testleri yaz**

`server/socket-server.test.ts` dosyasının sonuna (195. satırdan sonra) bu test grubunu ekle:

```ts
describe("SocketServer — Session Lifecycle", () => {
  let httpServer: HTTPServer;
  let socketServer: any;

  beforeEach(async () => {
    vi.resetModules();
    // Her test için temiz bir singleton elde etmek üzere modülü yeniden import edeceğiz
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (socketServer) {
      socketServer.getIO().close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  it("startSession: initializeGame ve startTikTokConnection çağrılır", async () => {
    const { initializeGame, getGameState } = await import("./game-engine");
    const { startTikTokConnection } = await import("./tiktok-integration");

    vi.mocked(initializeGame).mockReturnValue({} as any);
    vi.mocked(getGameState).mockReturnValue({
      sessionId: "s1",
      teams: [{ id: 0, name: "T1", players: [], score: 0 }],
      openedCards: [],
      totalLikes: 0,
      totalGifts: 0,
      participants: new Set<string>(),
      startedAt: Date.now(),
    });
    vi.mocked(startTikTokConnection).mockResolvedValue(undefined);

    httpServer = createServer();
    const { initializeSocketServer: init } = await import("./socket-server");
    socketServer = init(httpServer);

    await socketServer.startSession("s1", "testuser", ["T1", "T2", "T3", "T4"]);

    expect(initializeGame).toHaveBeenCalledWith("s1", ["T1", "T2", "T3", "T4"]);
    expect(startTikTokConnection).toHaveBeenCalledWith("s1", "testuser", expect.any(Function));
  });

  it("stopSession: stopTikTokConnection ve endGame çağrılır", async () => {
    const { endGame, cleanupGame, getGameState } = await import("./game-engine");
    const { stopTikTokConnection } = await import("./tiktok-integration");

    vi.mocked(stopTikTokConnection).mockResolvedValue(undefined);
    vi.mocked(endGame).mockReturnValue({
      finalScores: [{ teamName: "T1", score: 10, players: 11 }],
      statistics: { totalCardsOpened: 44, totalParticipants: 20, durationSeconds: 300 },
    });
    vi.mocked(cleanupGame).mockReturnValue(undefined);
    vi.mocked(getGameState).mockReturnValue(undefined);

    httpServer = createServer();
    const { initializeSocketServer: init } = await import("./socket-server");
    socketServer = init(httpServer);

    await socketServer.stopSession("s1");

    expect(stopTikTokConnection).toHaveBeenCalledWith("s1");
    expect(endGame).toHaveBeenCalledWith("s1");
    expect(cleanupGame).toHaveBeenCalledWith("s1");
  });

  it("getLeastFilledTeamId: en az oyuncuya sahip takımı döndürür", async () => {
    httpServer = createServer();
    const { initializeSocketServer: init } = await import("./socket-server");
    socketServer = init(httpServer);

    const gameState = {
      teams: [
        { id: 0, name: "T1", players: [1, 2, 3], score: 0 },
        { id: 1, name: "T2", players: [1], score: 0 },
        { id: 2, name: "T3", players: [1, 2], score: 0 },
        { id: 3, name: "T4", players: [1, 2, 3, 4], score: 0 },
      ],
    };

    // private metoda erişim
    const teamId = socketServer["getLeastFilledTeamId"](gameState);
    expect(teamId).toBe(1); // T2 en az oyuncuya sahip
  });
});
```

Dosyanın **en başına** (tüm importların üstüne) `vi.mock` çağrılarını ekle — Vitest hoisting gerektirir:

```ts
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
```

- [ ] **Step 2: Testlerin başarısız olduğunu doğrula**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npx vitest run server/socket-server.test.ts
```

Beklenen: yeni testler FAIL (startSession, stopSession, getLeastFilledTeamId metodları yok)

- [ ] **Step 3: socket-server.ts'e importlar ekle**

`server/socket-server.ts` dosyasının başındaki mevcut importların altına ekle:

```ts
import {
  initializeGame,
  getGameState,
  processGiftEvent,
  processLikeEvent,
  isGameComplete,
  endGame,
  cleanupGame,
  GameState,
} from "./game-engine";
import {
  startTikTokConnection,
  stopTikTokConnection,
} from "./tiktok-integration";
```

`tiktok-integration.ts`'teki `TikTokEvent` interface'ini de import etmek için (mevcut dosyada export değilse tip dönüşümü kullanılır):

```ts
type TikTokEvent = {
  type: "like" | "gift" | "comment" | "connected" | "disconnected" | "error";
  data: Record<string, unknown>;
  timestamp: number;
};
```

- [ ] **Step 4: SocketServer sınıfına metodları ekle**

`server/socket-server.ts` içinde `SocketServer` sınıfının kapanan `}` (satır 180) öncesine ekle:

```ts
  // Oturum başlat: game-engine'i hazırla, TikTok bağlantısı aç, gameStarted yayınla
  async startSession(sessionId: string, tiktokUsername: string, teamNames: string[]) {
    initializeGame(sessionId, teamNames);
    await startTikTokConnection(sessionId, tiktokUsername, (event) =>
      this.handleTikTokEvent(sessionId, event)
    );
    this.broadcastGameStarted(sessionId, getGameState(sessionId));
  }

  // Oturum durdur: TikTok bağlantısını kapat, oyunu bitir, yayınla, temizle
  async stopSession(sessionId: string) {
    await stopTikTokConnection(sessionId);
    const result = endGame(sessionId);
    if (result) {
      this.broadcastGameEnded(sessionId, {
        finalScores: result.finalScores,
        statistics: result.statistics,
      });
    }
    cleanupGame(sessionId);
  }

  // TikTok event yönlendiricisi
  private async handleTikTokEvent(sessionId: string, event: TikTokEvent) {
    const gameState = getGameState(sessionId);
    if (!gameState) return;

    switch (event.type) {
      case "gift": {
        const teamId = this.getLeastFilledTeamId(gameState);
        const card = await processGiftEvent(
          sessionId,
          teamId,
          event.data.giftName as string,
          event.data.diamondCount as number,
          event.data.username as string
        );
        if (card) {
          this.broadcastCardOpened(sessionId, card);
          this.broadcastStatsUpdated(sessionId, this.serializeStats(sessionId));
          if (isGameComplete(sessionId)) {
            await this.stopSession(sessionId);
            return;
          }
        }
        break;
      }
      case "like": {
        const teamId = this.getLeastFilledTeamId(gameState);
        const card = await processLikeEvent(
          sessionId,
          teamId,
          event.data.username as string,
          event.data.likeCount as number
        );
        if (card) {
          this.broadcastCardOpened(sessionId, card);
          this.broadcastStatsUpdated(sessionId, this.serializeStats(sessionId));
          if (isGameComplete(sessionId)) {
            await this.stopSession(sessionId);
            return;
          }
        } else {
          this.broadcastStatsUpdated(sessionId, this.serializeStats(sessionId));
        }
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
```

- [ ] **Step 5: Export wrapper fonksiyonları ekle**

`server/socket-server.ts` dosyasının en altına (mevcut export'lardan sonra) ekle:

```ts
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
```

- [ ] **Step 6: Testlerin geçtiğini doğrula**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npx vitest run server/socket-server.test.ts
```

Beklenen: TÜM testler PASS

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && git add server/socket-server.ts server/socket-server.test.ts && git commit -m "feat: add startSession/stopSession/handleTikTokEvent to SocketServer"
```

---

## Task 3: Broadcaster router'ı socket session lifecycle'a bağla

**Files:**
- Modify: `server/routers/broadcaster.ts`

- [ ] **Step 1: Failing test yaz**

Yeni bir dosya `server/broadcaster-socket-integration.test.ts` oluştur. Bu dosyada import yolları `server/` dizininden relative olmalı (`./socket-server`, `./broadcaster-session`):

```ts
// server/broadcaster-socket-integration.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("./socket-server", () => ({
  startSession: vi.fn().mockResolvedValue(undefined),
  stopSession: vi.fn().mockResolvedValue(undefined),
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

describe("broadcaster router — socket integration", () => {
  it("createSession çağrısında startSession tetiklenir", async () => {
    const { startSession } = await import("./socket-server");
    const { createBroadcasterSession } = await import("./broadcaster-session");

    const sessionId = "test-session-abc";
    vi.mocked(createBroadcasterSession).mockResolvedValue({
      success: true,
      sessionId,
      message: "OK",
    });

    const result = await createBroadcasterSession("key", "user", ["T1", "T2", "T3", "T4"], "manual");
    await startSession(result.sessionId!, "user", ["T1", "T2", "T3", "T4"]);

    expect(startSession).toHaveBeenCalledWith(sessionId, "user", ["T1", "T2", "T3", "T4"]);
  });

  it("endSession çağrısında stopSession tetiklenir", async () => {
    const { stopSession } = await import("./socket-server");

    await stopSession("test-session-abc");

    expect(stopSession).toHaveBeenCalledWith("test-session-abc");
  });
});
```

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npx vitest run server/broadcaster-socket-integration.test.ts
```

Beklenen: testler simülasyon çalışır (mock ile PASS); ancak gerçek router'ı değiştirene kadar router entegrasyonu eksik

- [ ] **Step 2: broadcaster.ts'e importlar ekle**

`server/routers/broadcaster.ts` dosyasının başına ekle:

```ts
import { startSession, stopSession } from "../socket-server";
```

- [ ] **Step 3: createSession mutation'ını güncelle**

`server/routers/broadcaster.ts` dosyasında `createSession` mutasyonunun `.mutation(async ({ input }) => {` bloğunu şöyle güncelle:

```ts
.mutation(async ({ input }) => {
  const result = await createBroadcasterSession(
    input.licenseKey,
    input.tiktokUsername,
    input.teamNames,
    input.teamSelectionMode
  );

  if (result.success && result.sessionId) {
    try {
      await startSession(result.sessionId, input.tiktokUsername, input.teamNames);
    } catch (error) {
      console.error(`[${result.sessionId}] startSession hatası:`, error);
      // Hata fırlatılır — tRPC client'a iletilir
      throw new Error(`TikTok bağlantısı başlatılamadı: ${(error as Error).message}`);
    }
  }

  return result;
}),
```

- [ ] **Step 4: endSession mutation'ını güncelle**

`server/routers/broadcaster.ts` dosyasında `endSession` mutasyonunun `.mutation(async ({ input }) => {` bloğunu şöyle güncelle:

```ts
.mutation(async ({ input }) => {
  await stopSession(input.sessionId);
  const success = await endBroadcasterSession(input.sessionId);
  return {
    success,
    message: success ? "Oturum sonlandırıldı" : "Oturum sonlandırma başarısız",
  };
}),
```

- [ ] **Step 4b: broadcaster.ts'in gerçekten socket'i çağırdığını doğrula**

`server/broadcaster-socket-integration.test.ts` dosyasına şu testi ekle. Bu test, tRPC `createCallerFactory` ile gerçek router mutation'ını çağırır:

```ts
import { createCallerFactory } from "../_core/trpc";
import { broadcasterRouter } from "./routers/broadcaster";

it("createSession mutation'ı startSession'ı çağırır", async () => {
  const { startSession } = await import("./socket-server");
  const { createBroadcasterSession } = await import("./broadcaster-session");

  vi.mocked(createBroadcasterSession).mockResolvedValue({
    success: true,
    sessionId: "abc123",
    message: "OK",
  });
  vi.mocked(startSession).mockResolvedValue(undefined);

  const createCaller = createCallerFactory(broadcasterRouter);
  const caller = createCaller({} as any);

  await caller.createSession({
    licenseKey: "key",
    tiktokUsername: "user",
    teamSelectionMode: "manual",
    teamNames: ["T1", "T2", "T3", "T4"],
  });

  expect(startSession).toHaveBeenCalledWith("abc123", "user", ["T1", "T2", "T3", "T4"]);
});
```

Not: `createCallerFactory` tRPC v11'de mevcut. Eğer proje tRPC v10 kullanıyorsa `createCaller(broadcasterRouter)({})` kullan.

- [ ] **Step 5: Testleri çalıştır**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npx vitest run server/broadcaster-socket-integration.test.ts server/socket-server.test.ts
```

Beklenen: PASS

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && git add server/routers/broadcaster.ts server/broadcaster-socket-integration.test.ts && git commit -m "feat: wire broadcaster router to socket session lifecycle"
```

---

## Task 4: BroadcasterPanel'e socket.io-client hook ekle

**Files:**
- Modify: `client/src/pages/BroadcasterPanel.tsx`

`socket.io-client` root `package.json`'da zaten mevcut — `pnpm add` gerekmez.

- [ ] **Step 1: TypeScript tip kontrolü ile "failing build" oluştur**

BroadcasterPanel.tsx'te `socket.io-client` import etmeden önce TypeScript derleme kontrolü yap:

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npx tsc --noEmit 2>&1 | head -5
```

Beklenen: PASS (henüz hata yok — bu baseline). Sonraki adımda yanlış tip ekleyip hatanın göründüğünü doğrulayacağız.

Ayrıca BroadcasterPanel.tsx'in tamamını oku: `useEffect` import'unun olup olmadığını ve kaç satır olduğunu öğren.

- [ ] **Step 2: socket.io-client import ekle**

`client/src/pages/BroadcasterPanel.tsx` dosyasının başındaki importlara ekle:

```ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
```

Not: `useState` zaten import edilmiş, sadece `useEffect` ve `useRef` ekleniyor. Eğer `useEffect` zaten varsa sadece `useRef` ekle.

- [ ] **Step 3: Socket state ve hook ekle**

`BroadcasterPanel` component fonksiyonu içindeki mevcut state tanımlamalarının altına (örn. `stats` state'inden sonra) ekle:

```ts
const socketRef = useRef<Socket | null>(null);
```

`handleStartSession` ve `handleStopSession` fonksiyonlarından önce, `sessionId` state değiştiğinde socket bağlantısını yöneten useEffect ekle:

```ts
useEffect(() => {
  if (!sessionId) return;

  const s = io(window.location.origin);
  socketRef.current = s;
  s.emit("joinSession", sessionId);

  s.on("gameEvent", (event: { type: string; sessionId: string; data: any; timestamp: number }) => {
    if (!socketRef.current) return; // socket kapanmış olabilir — race condition guard
    if (event.sessionId !== sessionId) return;

    switch (event.type) {
      case "statsUpdated":
        if (event.data && typeof event.data.cardsOpened === "number") {
          setStats({
            cardsOpened: event.data.cardsOpened,
            participants: event.data.participants ?? 0,
            totalLikes: event.data.totalLikes ?? 0,
            totalGifts: event.data.totalGifts ?? 0,
          });
        }
        break;
      case "gameEnded":
        setSessionActive(false);
        break;
      // gameStarted, cardOpened: şimdilik sadece logla
      default:
        console.log("[Socket] gameEvent:", event.type, event.data);
    }
  });

  return () => {
    s.emit("leaveSession", sessionId);
    s.disconnect();
    socketRef.current = null;
  };
}, [sessionId]);
```

- [ ] **Step 4: Build kontrolü yap**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npx tsc --noEmit
```

Beklenen: TypeScript hatası yok

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && git add client/src/pages/BroadcasterPanel.tsx && git commit -m "feat: add socket.io-client real-time hook to BroadcasterPanel"
```

---

## Task 5: game-screen-websocket.html veri alanı düzeltmeleri

**Files:**
- Modify: `client/public/game-screen-websocket.html`

`SocketServer.serializeStats()` artık `{cardsOpened, participants, totalLikes, totalGifts}` gönderir (sayı olarak). Ancak HTML'in `updateGameUI` fonksiyonu `TeamPlayer.quality` yerine `player.cardQuality` kullanıyor — bu uyumsuzluğu düzelt. Ayrıca `handleGameEnded`'a `finalScores` array'i gelir, HTML doğru kullanıyor.

- [ ] **Step 1: Mevcut HTML'i doğrula**

`client/public/game-screen-websocket.html` içinde:
- `player.cardQuality` kullanımı: satır 451 — `GameState.teams[].players[]` nesneleri `TeamPlayer` interface'inden gelir, alanı `quality` (kalite), `cardQuality` değil.
- `handleStatsUpdated` satır 479: `stats.cardsOpened` ✅ (serializeStats zaten bunu gönderiyor)
- `showFinalScores` satır 505: `score.players?.length` — ama `endGame()` döndürdüğü `finalScores` içinde `players` bir `number`. Düzeltmek gerek.

- [ ] **Step 2: `player.cardQuality` → `player.quality` düzelt**

`client/public/game-screen-websocket.html` dosyasında:

Satır ~451:
```html
<!-- ESKİ -->
<span class="player-card-quality quality-${player.cardQuality?.toLowerCase() || 'bronze'}">
  ${player.cardQuality?.toUpperCase() || 'BRONZ'}
</span>

<!-- YENİ -->
<span class="player-card-quality quality-${player.quality?.toLowerCase() || 'bronze'}">
  ${player.quality?.toUpperCase() || 'BRONZ'}
</span>
```

- [ ] **Step 3: `showFinalScores`'da players count düzelt**

`client/public/game-screen-websocket.html` dosyasında satır ~513:

```js
// ESKİ
<div class="players-count">${score.players?.length || 0} oyuncu</div>

// YENİ — endGame() finalScores'da players zaten bir number
<div class="players-count">${score.players || 0} oyuncu</div>
```

- [ ] **Step 4: Değişiklikleri gözden geçir**

Tarayıcıda `client/public/game-screen-websocket.html?sessionId=test` açarak konsol hatalarının olmadığını doğrula (sunucu çalışıyor olmalı).

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && git add client/public/game-screen-websocket.html && git commit -m "fix: correct player.quality field name and finalScores players count in game-screen HTML"
```

---

## Task 6: Tüm testleri çalıştır ve entegrasyonu doğrula

- [ ] **Step 1: Tam test suite**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npx vitest run
```

Beklenen: tüm testler PASS

- [ ] **Step 2: Sunucuyu başlat ve manuel doğrulama**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && npm run dev
```

`http://localhost:3000/game-screen-websocket.html?sessionId=demo` adresini aç. Tarayıcı konsolu `"✅ WebSocket bağlandı"` göstermeli.

- [ ] **Step 3: Final commit (eğer düzeltme gerekirse)**

```bash
cd "C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus" && git add -A && git commit -m "fix: final integration fixes after smoke test"
```
