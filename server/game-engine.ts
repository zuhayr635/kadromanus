import { getDb } from "./db";
import { giftTiers, players, sessions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface GameState {
  sessionId: string;
  teams: Team[];
  openedCards: OpenedCard[];
  pendingCard: PendingCard | null;  // currently displayed card (being assigned to a team)
  cardQueue: PendingCard[];         // queued cards waiting to be shown
  totalLikes: number;
  totalGifts: number;
  likeCardCount: number; // tracks only like-triggered cards (independent of gift cards)
  participants: Set<string>;
  startedAt: number;
  endedAt?: number;
  isPaused: boolean;
  topViewers: Map<string, { displayName: string; total: number }>;
  winSettings?: WinSettings;
}

export interface WinSettings {
  mode: 'cards' | 'score';
  cardsTarget: number;
  scoreTarget: number;
}

export interface Team {
  id: number;
  name: string;
  players: TeamPlayer[];
  score: number;
}

export interface TeamPlayer {
  playerId: number;
  name: string;
  position: string;
  quality: CardQuality;
  openedBy: string;
  overall?: number;
  faceImageUrl?: string;
  nation?: string;
  team?: string;
}

export interface OpenedCard {
  playerId: number;
  quality: CardQuality;
  teamId: number;
  openedBy: string;
  timestamp: number;
}

export interface PendingCard {
  username: string;
  displayName?: string;
  profilePic?: string;
  quality: CardQuality;
  source?: 'like' | 'gift';
  player: { id: number; name: string; position: string; overall?: number; faceImageUrl?: string; nation?: string; team?: string };
  timestamp: number;
  gift?: {
    name: string;
    amount: number;
    image?: string;
    emoji?: string;
  };
}

export type CardQuality = "bronze" | "silver" | "gold" | "elite";
export type TierLevel = "1" | "2" | "3";

const gameStates = new Map<string, GameState>();

let likeThreshold = 100;
export function getLikeThreshold(): number { return likeThreshold; }
export function setLikeThreshold(n: number): void { likeThreshold = Math.max(1, n); }

// Diamond (coin) thresholds per card quality. Anything below silverMin → bronze.
let diamondThresholds = { silver: 10, gold: 50, elite: 200 };
export function getDiamondThresholds() { return { ...diamondThresholds }; }
export function setDiamondThresholds(t: { silver: number; gold: number; elite: number }) {
  diamondThresholds = { silver: Math.max(1, t.silver), gold: Math.max(1, t.gold), elite: Math.max(1, t.elite) };
}

/**
 * Set win settings for a game session
 */
export function setWinSettings(sessionId: string, settings: WinSettings): boolean {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return false;
  gameState.winSettings = settings;
  console.log(`[${sessionId}] Win settings updated:`, settings);
  return true;
}

/**
 * Get win settings for a game session
 */
export function getWinSettings(sessionId: string): WinSettings | undefined {
  const gameState = gameStates.get(sessionId);
  return gameState?.winSettings;
}
function qualityFromDiamonds(diamonds: number): CardQuality {
  if (diamonds >= diamondThresholds.elite) return "elite";
  if (diamonds >= diamondThresholds.gold) return "gold";
  if (diamonds >= diamondThresholds.silver) return "silver";
  return "bronze";
}

/**
 * Initialize a new game session
 */
export function initializeGame(
  sessionId: string,
  teamNames: string[]
): GameState {
  const teams: Team[] = teamNames.map((name, index) => ({
    id: index,
    name,
    players: [],
    score: 0,
  }));

  const gameState: GameState = {
    sessionId,
    teams,
    openedCards: [],
    pendingCard: null,
    cardQueue: [],
    totalLikes: 0,
    totalGifts: 0,
    likeCardCount: 0,
    participants: new Set(),
    startedAt: Date.now(),
    isPaused: false,
    topViewers: new Map(),
    winSettings: { mode: 'cards', cardsTarget: 44, scoreTarget: 500 },
  };

  gameStates.set(sessionId, gameState);
  console.log(`[${sessionId}] Oyun başlatıldı: ${teamNames.join(", ")}`);

  return gameState;
}

/**
 * Get current game state
 */
export function getGameState(sessionId: string): GameState | undefined {
  return gameStates.get(sessionId);
}

/**
 * Get gift tier for a specific gift
 */
export async function getGiftTier(
  giftName: string
): Promise<{ tier: TierLevel; quality: CardQuality } | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(giftTiers)
      .where(eq(giftTiers.giftName, giftName))
      .limit(1);

    if (result.length > 0) {
      return {
        tier: result[0].tierLevel as TierLevel,
        quality: result[0].cardQuality as CardQuality,
      };
    }
  } catch (error) {
    console.error(`Hediye tier hatası: ${giftName}`, error);
  }

  return null;
}

/**
 * Get random player from database
 * Returns null if no players available - no fallback to fake data
 */
export async function getRandomPlayer(): Promise<any | null> {
  const db = await getDb();

  try {
    if (db) {
      const allPlayers = await db.select().from(players);
      if (allPlayers.length > 0) {
        const randomIndex = Math.floor(Math.random() * allPlayers.length);
        return allPlayers[randomIndex];
      }
    }
  } catch (error) {
    console.error("Oyuncu seçme hatası:", error);
  }

  // No fallback - must have real players in database
  console.error("⚠️ Veritabanında oyuncu bulunamadı! Lütfen seed scriptini çalıştırın.");
  return null;
}

/**
 * Open a card based on gift tier
 */
export async function openCard(
  sessionId: string,
  teamId: number,
  quality: CardQuality,
  openedBy: string
): Promise<OpenedCard | null> {
  const gameState = gameStates.get(sessionId);
  if (!gameState) {
    console.error(`[${sessionId}] Oyun durumu bulunamadı`);
    return null;
  }

  // Get random player
  const player = await getRandomPlayer();
  if (!player) {
    console.error(`[${sessionId}] Oyuncu bulunamadı`);
    return null;
  }

  // Check if team is valid
  if (teamId < 0 || teamId >= gameState.teams.length) {
    console.error(`[${sessionId}] Geçersiz takım ID: ${teamId}`);
    return null;
  }

  const team = gameState.teams[teamId];
  const teamPlayer: TeamPlayer = {
    playerId: player.id,
    name: player.name,
    position: player.position,
    quality,
    openedBy,
    overall: player.overall,
    faceImageUrl: player.faceImageUrl,
    nation: player.nation,
    team: player.team,
  };

  // Add player to team
  team.players.push(teamPlayer);

  // Score = player overall rating (mc-rat value), fallback to quality tier
  const qualityFallback: Record<CardQuality, number> = { bronze: 10, silver: 25, gold: 50, elite: 100 };
  team.score += player.overall ?? qualityFallback[quality];

  // Track opened card
  const openedCard: OpenedCard = {
    playerId: player.id,
    quality,
    teamId,
    openedBy,
    timestamp: Date.now(),
  };

  gameState.openedCards.push(openedCard);
  gameState.participants.add(openedBy);

  console.log(
    `[${sessionId}] Kart açıldı: ${player.name} (${quality}) -> ${team.name} (${openedBy})`
  );

  return openedCard;
}

/**
 * Internal: dequeue next card from queue → set as pendingCard.
 * Returns the new pendingCard, or null if queue empty or already busy.
 */
function tryDequeue(gameState: GameState): PendingCard | null {
  if (gameState.pendingCard || gameState.cardQueue.length === 0) return null;
  gameState.pendingCard = gameState.cardQueue.shift()!;
  return gameState.pendingCard;
}

/** Pause/resume the game for a session */
export function pauseGame(sessionId: string): boolean {
  const gs = gameStates.get(sessionId);
  if (!gs) return false;
  gs.isPaused = true;
  console.log(`[${sessionId}] Oyun duraklatıldı`);
  return true;
}

export function resumeGame(sessionId: string): boolean {
  const gs = gameStates.get(sessionId);
  if (!gs) return false;
  gs.isPaused = false;
  console.log(`[${sessionId}] Oyun devam ediyor`);
  return true;
}

/** Get top viewers sorted by total contribution */
export function getTopViewers(sessionId: string): Array<{ username: string; displayName: string; total: number }> {
  const gs = gameStates.get(sessionId);
  if (!gs) return [];
  return Array.from(gs.topViewers.entries())
    .map(([username, data]) => ({ username, displayName: data.displayName, total: data.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

/** Exported variant for socket-server to call after confirmPendingCard */
export function dequeueNextCard(sessionId: string): PendingCard | null {
  const gs = gameStates.get(sessionId);
  if (!gs) return null;
  return tryDequeue(gs);
}

/**
 * Process like event — creates a pending card when threshold is reached.
 * Team assignment happens later via confirmPendingCard.
 */
export async function processLikeEvent(
  sessionId: string,
  username: string,
  likeCount: number,
  profilePic?: string,
  displayName?: string
): Promise<PendingCard | null> {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return null;

  if (gameState.isPaused) return null;

  gameState.totalLikes += likeCount;
  gameState.participants.add(username);

  // Update top viewers
  const existing = gameState.topViewers.get(username);
  if (existing) {
    existing.total += likeCount;
    if (displayName) existing.displayName = displayName;
  } else {
    gameState.topViewers.set(username, { displayName: displayName ?? username, total: likeCount });
  }

  // likeThreshold likes = 1 card (configurable via setLikeThreshold)
  // Compare only against like-triggered cards — gift cards must not block like cards
  const cardsToOpen = Math.floor(gameState.totalLikes / likeThreshold);

  // Loop: handles batched like events that cross multiple thresholds at once
  while (cardsToOpen > gameState.likeCardCount) {
    const player = await getRandomPlayer();
    if (!player) break;
    gameState.likeCardCount++;
    const pending: PendingCard = {
      username,
      displayName,
      profilePic,
      quality: "bronze",
      source: "like",
      player: { id: player.id, name: player.name, position: player.position, overall: player.overall, faceImageUrl: player.faceImageUrl, nation: player.nation, team: player.team },
      timestamp: Date.now(),
    };
    // Queue the card; show immediately if nothing is pending
    gameState.cardQueue.push(pending);
    console.log(`[${sessionId}] Beğeni eşiği: kart kuyruğa eklendi (${username}), kuyruk=${gameState.cardQueue.length}, likeCardCount=${gameState.likeCardCount}`);
  }

  return tryDequeue(gameState);
}

/**
 * Process gift event — creates a pending card based on gift config.
 * Checks session's giftTriggerMode:
 *   'diamond' (default): all gifts trigger cards, quality from diamond thresholds
 *   'specific': only activeGiftIds gifts trigger cards, quality from DB
 * Team assignment happens later via confirmPendingCard.
 */
export async function processGiftEvent(
  sessionId: string,
  giftName: string,
  diamondCount: number,
  username: string,
  profilePic?: string,
  displayName?: string,
  giftImage?: string
): Promise<PendingCard | null> {
  console.log(`[${sessionId}] DEBUG processGiftEvent: profilePic="${profilePic}" displayName="${displayName}" username="${username}"`);
  const gameState = gameStates.get(sessionId);
  if (!gameState) return null;

  if (gameState.isPaused) return null;

  gameState.totalGifts += diamondCount;
  gameState.participants.add(username);

  // Update top viewers
  const existingViewer = gameState.topViewers.get(username);
  if (existingViewer) {
    existingViewer.total += diamondCount;
    if (displayName) existingViewer.displayName = displayName;
  } else {
    gameState.topViewers.set(username, { displayName: displayName ?? username, total: diamondCount });
  }

  const db = await getDb();
  let quality: CardQuality = "bronze"; // Default fallback

  // Session gift config kontrolü
  if (db) {
    try {
      // Session'ı getir
      const [sessionData] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sessionId, sessionId))
        .limit(1);

      if (sessionData?.giftConfig) {
        const giftConfig = sessionData.giftConfig as { activeGiftIds?: number[]; giftTriggerMode?: string; customMappings?: Record<number, CardQuality> };
        const triggerMode = giftConfig.giftTriggerMode ?? 'diamond';

        // Gift'i DB'den bul
        const [giftData] = await db
          .select()
          .from(giftTiers)
          .where(eq(giftTiers.giftName, giftName))
          .limit(1);

        if (triggerMode === 'disabled') {
          console.log(`[${sessionId}] Gift "${giftName}" → hediye sistemi devre dışı, yok sayılıyor`);
          return null;
        }

        if (triggerMode === 'specific') {
          // Tekil mod: sadece seçili hediyeler kart tetikler
          const activeIds = giftConfig.activeGiftIds;
          if (Array.isArray(activeIds) && activeIds.length > 0) {
            if (!giftData || !activeIds.includes(giftData.id)) {
              console.log(`[${sessionId}] Gift "${giftName}" tekil hediye listesinde değil, yok sayılıyor`);
              return null;
            }
          }
          // Tekil modda DB'den kalite kullan
          quality = giftData ? (giftData.cardQuality as CardQuality) : qualityFromDiamonds(diamondCount);
        } else {
          // Jeton modu (varsayılan): jeton miktarına göre kalite, activeGiftIds yok sayılır
          quality = qualityFromDiamonds(diamondCount);
        }
      } else {
        // Session gift config yoksa fallback: diamond threshold
        quality = qualityFromDiamonds(diamondCount);
      }
    } catch (error) {
      console.error(`[${sessionId}] Gift config okuma hatası:`, error);
      // Hata durumunda fallback: diamond threshold
      quality = qualityFromDiamonds(diamondCount);
    }
  } else {
    // DB yoksa fallback: diamond threshold
    quality = qualityFromDiamonds(diamondCount);
  }

  const player = await getRandomPlayer();
  if (!player) return null;

  // Gift resim URL'sini DB'den al (parametre yoksa)
  let resolvedGiftImage = giftImage;
  if (!resolvedGiftImage && db) {
    try {
      const [giftData] = await db
        .select()
        .from(giftTiers)
        .where(eq(giftTiers.giftName, giftName))
        .limit(1);
      if (giftData) {
        resolvedGiftImage = giftData.image ?? undefined;
      }
    } catch (error) {
      console.error(`[${sessionId}] Gift resim fetching hatası:`, error);
    }
  }

  const pending: PendingCard = {
    username,
    displayName,
    profilePic,
    quality,
    source: "gift",
    player: { id: player.id, name: player.name, position: player.position, overall: player.overall, faceImageUrl: player.faceImageUrl, nation: player.nation, team: player.team },
    timestamp: Date.now(),
    gift: {
      name: giftName,
      amount: diamondCount,
      image: resolvedGiftImage,
    },
  };
  // Queue the card; show immediately if nothing is pending
  gameState.cardQueue.push(pending);
  console.log(`[${sessionId}] Hediye: ${giftName} (${diamondCount} jeton) → ${quality} kuyruğa eklendi (${username}), kuyruk=${gameState.cardQueue.length}`);
  return tryDequeue(gameState);
}

/**
 * Skip (discard) the current pending card and dequeue the next one.
 */
export function skipPendingCard(sessionId: string): PendingCard | null {
  const gameState = gameStates.get(sessionId);
  if (!gameState || !gameState.pendingCard) return null;
  gameState.pendingCard = null;
  return tryDequeue(gameState);
}

/**
 * Confirm a pending card — assigns it to the chosen team and clears pending state.
 */
export async function confirmPendingCard(
  sessionId: string,
  teamId: number
): Promise<OpenedCard | null> {
  const gameState = gameStates.get(sessionId);
  if (!gameState || !gameState.pendingCard) return null;

  const { username, quality, player } = gameState.pendingCard;
  gameState.pendingCard = null;

  if (teamId < 0 || teamId >= gameState.teams.length) return null;

  const team = gameState.teams[teamId];
  team.players.push({ playerId: player.id, name: player.name, position: player.position, quality, openedBy: username, overall: player.overall, faceImageUrl: player.faceImageUrl, nation: player.nation, team: player.team });

  const qualityFallback: Record<CardQuality, number> = { bronze: 10, silver: 25, gold: 50, elite: 100 };
  team.score += player.overall ?? qualityFallback[quality];

  const openedCard: OpenedCard = { playerId: player.id, quality, teamId, openedBy: username, timestamp: Date.now() };
  gameState.openedCards.push(openedCard);

  console.log(`[${sessionId}] Kart onaylandı: ${player.name} (${quality}) → ${team.name} (${username})`);
  return openedCard;
}

/**
 * Check if game is complete based on win settings
 * - cards mode: total cards reach target (default 44)
 * - score mode: any team reaches target score (default 500)
 */
export function isGameComplete(sessionId: string): boolean {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return false;

  const settings = gameState.winSettings || { mode: 'cards' as const, cardsTarget: 44, scoreTarget: 500 };

  if (settings.mode === 'cards') {
    const totalCards = gameState.teams.reduce((sum, team) => sum + team.players.length, 0);
    return totalCards >= settings.cardsTarget;
  } else {
    // score mode: any team reaches target score
    const winner = gameState.teams.find(team => team.score >= settings.scoreTarget);
    if (winner) {
      console.log(`[${sessionId}] 🏆 Hedef puana ulaşıldı: ${winner.name} = ${winner.score} (hedef: ${settings.scoreTarget})`);
    }
    return !!winner;
  }
}

/**
 * End game and return final scores + winner
 */
export function endGame(
  sessionId: string
): {
  finalScores: Array<{ teamName: string; score: number; players: number }>;
  winner: { teamName: string; score: number; players: number };
  statistics: {
    totalCardsOpened: number;
    totalParticipants: number;
    durationSeconds: number;
  };
} | null {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return null;

  gameState.endedAt = Date.now();

  const finalScores = gameState.teams.map((team) => ({
    teamName: team.name,
    score: team.score,
    players: team.players.length,
  }));

  // Kazanan: en yüksek puana sahip takım
  const sorted = [...finalScores].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  const statistics = {
    totalCardsOpened: gameState.openedCards.length,
    totalParticipants: gameState.participants.size,
    durationSeconds: Math.floor(
      (gameState.endedAt - gameState.startedAt) / 1000
    ),
  };

  console.log(`[${sessionId}] Oyun bitti! Kazanan: ${winner.teamName} (${winner.score} puan)`, finalScores);

  return { finalScores, winner, statistics };
}

/**
 * Clean up game state
 */
export function cleanupGame(sessionId: string): void {
  gameStates.delete(sessionId);
  console.log(`[${sessionId}] Oyun durumu temizlendi`);
}

/**
 * Get all active games
 */
export function getActiveGames(): string[] {
  return Array.from(gameStates.keys());
}
