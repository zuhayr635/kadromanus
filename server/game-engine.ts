import { getDb } from "./db";
import { giftTiers, players } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface GameState {
  sessionId: string;
  teams: Team[];
  openedCards: OpenedCard[];
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
}

export interface OpenedCard {
  playerId: number;
  quality: CardQuality;
  teamId: number;
  openedBy: string;
  timestamp: number;
}

export type CardQuality = "bronze" | "silver" | "gold" | "elite";
export type TierLevel = "1" | "2" | "3";

const gameStates = new Map<string, GameState>();

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
 */
export async function getRandomPlayer(): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const allPlayers = await db.select().from(players);
    if (allPlayers.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * allPlayers.length);
    return allPlayers[randomIndex];
  } catch (error) {
    console.error("Oyuncu seçme hatası:", error);
  }

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
 * Process like event and potentially open a card
 */
export async function processLikeEvent(
  sessionId: string,
  teamId: number,
  username: string,
  likeCount: number
): Promise<OpenedCard | null> {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return null;

  gameState.totalLikes += likeCount;

  // Every 100 likes = 1 card (configurable)
  const cardsToOpen = Math.floor(gameState.totalLikes / 100);
  const previousCards = gameState.openedCards.length;

  if (cardsToOpen > previousCards) {
    // Open a bronze card for likes
    return await openCard(sessionId, teamId, "bronze", username);
  }

  return null;
}

/**
 * Process gift event and open corresponding card
 */
export async function processGiftEvent(
  sessionId: string,
  teamId: number,
  giftName: string,
  diamondCount: number,
  username: string
): Promise<OpenedCard | null> {
  const gameState = gameStates.get(sessionId);
  if (!gameState) return null;

  gameState.totalGifts += diamondCount;

  // Get gift tier
  const giftTier = await getGiftTier(giftName);
  if (!giftTier) {
    // Default to bronze if gift not found
    console.warn(`[${sessionId}] Hediye tier bulunamadı: ${giftName}`);
    return await openCard(sessionId, teamId, "bronze", username);
  }

  return await openCard(sessionId, teamId, giftTier.quality, username);
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
