import { getDb } from "./db";
import { giftTiers, players } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface GameState {
  sessionId: string;
  teams: Team[];
  openedCards: OpenedCard[];
  pendingCard: PendingCard | null;
  totalLikes: number;
  totalGifts: number;
  participants: Set<string>;
  startedAt: number;
  endedAt?: number;
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
  quality: CardQuality;
  player: { id: number; name: string; position: string; overall?: number; faceImageUrl?: string; nation?: string; team?: string };
  timestamp: number;
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
    totalLikes: 0,
    totalGifts: 0,
    participants: new Set(),
    startedAt: Date.now(),
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

  // Calculate score based on quality
  const scoreMap: Record<CardQuality, number> = {
    bronze: 10,
    silver: 25,
    gold: 50,
    elite: 100,
  };
  team.score += scoreMap[quality];

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
 * Process like event — creates a pending card when threshold is reached.
 * Team assignment happens later via confirmPendingCard.
 */
export async function processLikeEvent(
  sessionId: string,
  username: string,
  likeCount: number
): Promise<PendingCard | null> {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return null;

  gameState.totalLikes += likeCount;
  gameState.participants.add(username);

  // Already waiting for team selection — don't create another pending card
  if (gameState.pendingCard) return null;

  // likeThreshold likes = 1 card (configurable via setLikeThreshold)
  const cardsToOpen = Math.floor(gameState.totalLikes / likeThreshold);
  const existingCards = gameState.openedCards.length;

  if (cardsToOpen > existingCards) {
    const player = await getRandomPlayer();
    if (!player) return null;
    const pending: PendingCard = {
      username,
      quality: "bronze",
      player: { id: player.id, name: player.name, position: player.position, overall: player.overall, faceImageUrl: player.faceImageUrl, nation: player.nation, team: player.team },
      timestamp: Date.now(),
    };
    gameState.pendingCard = pending;
    console.log(`[${sessionId}] Beğeni eşiği: bekleyen kart oluşturuldu (${username})`);
    return pending;
  }

  return null;
}

/**
 * Process gift event — creates a pending card based on diamond count.
 * Team assignment happens later via confirmPendingCard.
 */
export async function processGiftEvent(
  sessionId: string,
  giftName: string,
  diamondCount: number,
  username: string
): Promise<PendingCard | null> {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return null;

  gameState.totalGifts += diamondCount;
  gameState.participants.add(username);

  // Already waiting for team selection — don't queue another pending card
  if (gameState.pendingCard) return null;

  const quality = qualityFromDiamonds(diamondCount);
  const player = await getRandomPlayer();
  if (!player) return null;

  const pending: PendingCard = {
    username,
    quality,
    player: { id: player.id, name: player.name, position: player.position, overall: player.overall, faceImageUrl: player.faceImageUrl, nation: player.nation, team: player.team },
    timestamp: Date.now(),
  };
  gameState.pendingCard = pending;
  console.log(`[${sessionId}] Hediye: ${giftName} (${diamondCount} jeton) → ${quality} bekleyen kart (${username})`);
  return pending;
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

  const scoreMap: Record<CardQuality, number> = { bronze: 10, silver: 25, gold: 50, elite: 100 };
  team.score += scoreMap[quality];

  const openedCard: OpenedCard = { playerId: player.id, quality, teamId, openedBy: username, timestamp: Date.now() };
  gameState.openedCards.push(openedCard);

  console.log(`[${sessionId}] Kart onaylandı: ${player.name} (${quality}) → ${team.name} (${username})`);
  return openedCard;
}

/**
 * Check if game is complete (all teams have 11 players)
 */
export function isGameComplete(sessionId: string): boolean {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return false;

  // Check if all teams have 11 players (full squad)
  const allTeamsFull = gameState.teams.every((team) => team.players.length >= 11);

  return allTeamsFull;
}

/**
 * End game and return final scores
 */
export function endGame(
  sessionId: string
): {
  finalScores: Array<{ teamName: string; score: number; players: number }>;
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

  const statistics = {
    totalCardsOpened: gameState.openedCards.length,
    totalParticipants: gameState.participants.size,
    durationSeconds: Math.floor(
      (gameState.endedAt - gameState.startedAt) / 1000
    ),
  };

  console.log(`[${sessionId}] Oyun bitti:`, finalScores);

  return { finalScores, statistics };
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
