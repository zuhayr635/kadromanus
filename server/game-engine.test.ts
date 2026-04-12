import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as gameEngine from "./game-engine";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("../drizzle/schema", () => ({
  giftTiers: {},
  players: {},
}));

describe("Game Engine", () => {
  const sessionId = "test-game-123";
  const teamNames = ["Fenerbahçe", "Galatasaray"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    gameEngine.cleanupGame(sessionId);
  });

  it("should initialize a new game with teams", () => {
    const gameState = gameEngine.initializeGame(sessionId, teamNames);

    expect(gameState.sessionId).toBe(sessionId);
    expect(gameState.teams).toHaveLength(2);
    expect(gameState.teams[0].name).toBe("Fenerbahçe");
    expect(gameState.teams[1].name).toBe("Galatasaray");
    expect(gameState.teams[0].score).toBe(0);
    expect(gameState.teams[0].players).toHaveLength(0);
  });

  it("should retrieve game state", () => {
    gameEngine.initializeGame(sessionId, teamNames);
    const gameState = gameEngine.getGameState(sessionId);

    expect(gameState).toBeDefined();
    expect(gameState?.sessionId).toBe(sessionId);
  });

  it("should return undefined for non-existent game", () => {
    const gameState = gameEngine.getGameState("non-existent");
    expect(gameState).toBeUndefined();
  });

  it("should track participants", () => {
    const gameState = gameEngine.initializeGame(sessionId, teamNames);

    expect(gameState.participants.size).toBe(0);

    gameState.participants.add("user1");
    gameState.participants.add("user2");
    gameState.participants.add("user1"); // Duplicate

    expect(gameState.participants.size).toBe(2);
  });

  it("should check if game is complete when total cards reach 44", () => {
    const gameState = gameEngine.initializeGame(sessionId, teamNames);

    expect(gameEngine.isGameComplete(sessionId)).toBe(false);

    // Add 11 players to first team
    for (let i = 0; i < 11; i++) {
      gameState.teams[0].players.push({
        playerId: i,
        name: `Player ${i}`,
        position: "FW",
        quality: "bronze",
        openedBy: "user1",
      });
    }

    // Add 11 players to second team (22 total - not enough)
    for (let i = 0; i < 11; i++) {
      gameState.teams[1].players.push({
        playerId: i + 11,
        name: `Player ${i + 11}`,
        position: "FW",
        quality: "bronze",
        openedBy: "user2",
      });
    }

    // Still not complete (need 44 total = 4 teams × 11 players)
    expect(gameEngine.isGameComplete(sessionId)).toBe(false);

    // Add third team (33 total)
    gameState.teams.push({
      id: 2,
      name: "Takım 3",
      players: [],
      score: 0,
    });
    for (let i = 0; i < 11; i++) {
      gameState.teams[2].players.push({
        playerId: i + 22,
        name: `Player ${i + 22}`,
        position: "FW",
        quality: "bronze",
        openedBy: "user3",
      });
    }

    // Still not complete (need 44 total)
    expect(gameEngine.isGameComplete(sessionId)).toBe(false);

    // Add 11 players to fourth team (44 total - complete!)
    gameState.teams.push({
      id: 3,
      name: "Takım 4",
      players: [],
      score: 0,
    });
    for (let i = 0; i < 11; i++) {
      gameState.teams[3].players.push({
        playerId: i + 33,
        name: `Player ${i + 33}`,
        position: "FW",
        quality: "bronze",
        openedBy: "user4",
      });
    }

    expect(gameEngine.isGameComplete(sessionId)).toBe(true);
  });

  it("should end game and return final scores", () => {
    const gameState = gameEngine.initializeGame(sessionId, teamNames);

    // Add some players with different qualities
    gameState.teams[0].players.push({
      playerId: 1,
      name: "Player 1",
      position: "FW",
      quality: "elite",
      openedBy: "user1",
    });
    gameState.teams[0].score = 100;

    gameState.teams[1].players.push({
      playerId: 2,
      name: "Player 2",
      position: "GK",
      quality: "gold",
      openedBy: "user2",
    });
    gameState.teams[1].score = 50;

    const result = gameEngine.endGame(sessionId);

    expect(result).toBeDefined();
    expect(result?.finalScores).toHaveLength(2);
    expect(result?.finalScores[0]).toEqual({
      teamName: "Fenerbahçe",
      score: 100,
      players: 1,
    });
    expect(result?.finalScores[1]).toEqual({
      teamName: "Galatasaray",
      score: 50,
      players: 1,
    });
    // totalCardsOpened reflects openedCards array length (0 in this test)
    expect(result?.statistics.totalCardsOpened).toBe(0);
    // totalParticipants reflects participants set size (0 in this test)
    expect(result?.statistics.totalParticipants).toBe(0);
    expect(result?.statistics.durationSeconds).toBeGreaterThanOrEqual(0);
  });

  it("should return null when ending non-existent game", () => {
    const result = gameEngine.endGame("non-existent");
    expect(result).toBeNull();
  });

  it("should cleanup game state", () => {
    gameEngine.initializeGame(sessionId, teamNames);
    expect(gameEngine.getGameState(sessionId)).toBeDefined();

    gameEngine.cleanupGame(sessionId);
    expect(gameEngine.getGameState(sessionId)).toBeUndefined();
  });

  it("should track active games", () => {
    const session1 = "game-1";
    const session2 = "game-2";

    gameEngine.initializeGame(session1, teamNames);
    gameEngine.initializeGame(session2, teamNames);

    const activeGames = gameEngine.getActiveGames();
    expect(activeGames).toContain(session1);
    expect(activeGames).toContain(session2);

    gameEngine.cleanupGame(session1);
    const updatedGames = gameEngine.getActiveGames();
    expect(updatedGames).not.toContain(session1);
    expect(updatedGames).toContain(session2);

    gameEngine.cleanupGame(session2);
  });

  it("should track opened cards", () => {
    const gameState = gameEngine.initializeGame(sessionId, teamNames);

    expect(gameState.openedCards).toHaveLength(0);

    // Simulate card opening (in real scenario, this would be done via openCard function)
    gameState.openedCards.push({
      playerId: 1,
      quality: "gold",
      teamId: 0,
      openedBy: "user1",
      timestamp: Date.now(),
    });

    expect(gameState.openedCards).toHaveLength(1);
    expect(gameState.openedCards[0].quality).toBe("gold");
  });

  it("should track total likes and gifts", () => {
    const gameState = gameEngine.initializeGame(sessionId, teamNames);

    expect(gameState.totalLikes).toBe(0);
    expect(gameState.totalGifts).toBe(0);

    gameState.totalLikes += 150;
    gameState.totalGifts += 500;

    expect(gameState.totalLikes).toBe(150);
    expect(gameState.totalGifts).toBe(500);
  });
});
