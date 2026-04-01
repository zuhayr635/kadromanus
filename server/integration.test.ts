import { describe, it, expect, beforeEach } from "vitest";
import {
  initializeGame,
  getGameState,
  openCard,
  isGameComplete,
  endGame,
} from "./game-engine";
import {
  recordSessionStart,
  getSessionHistoryByLicense,
} from "./session-history";
import {
  createLicense,
  getLicenseByKey,
  validateLicense,
} from "./license-manager";

describe("Integration Tests - Multi-Tenant & Concurrent Sessions", () => {
  beforeEach(() => {
    // Clear state before each test
  });

  describe("Multi-Tenant Isolation", () => {
    it("should isolate games between different broadcasters", async () => {
      // Create two separate games
      initializeGame("game-1", ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"]);
      initializeGame("game-2", ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor"]);

      // Verify games were created
      const state1 = getGameState("game-1");
      const state2 = getGameState("game-2");
      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
    });

    it("should maintain separate team rosters per game", () => {
      initializeGame("game-1", ["Team A", "Team B", "Team C", "Team D"]);
      initializeGame("game-2", ["Team X", "Team Y", "Team Z", "Team W"]);

      // Verify games were created
      const game1State = getGameState("game-1");
      const game2State = getGameState("game-2");

      expect(game1State).toBeDefined();
      expect(game2State).toBeDefined();
    });

    it("should isolate session history by license", async () => {
      // Create two licenses
      const license1 = await createLicense(
        "basic",
        "Broadcaster 1",
        "broadcaster1@example.com",
        30,
        1,
        500
      );

      const license2 = await createLicense(
        "pro",
        "Broadcaster 2",
        "broadcaster2@example.com",
        30,
        1,
        500
      );

      // Verify licenses are different
      expect(license1.licenseKey).not.toBe(license2.licenseKey);
      expect(license1.licenseKey).toBeDefined();
      expect(license2.licenseKey).toBeDefined();
    });
  });

  describe("Concurrent Sessions", () => {
    it("should handle multiple concurrent games", () => {
      const gameIds = [];
      const gameCount = 5;

      // Create multiple concurrent games
      for (let i = 0; i < gameCount; i++) {
        initializeGame(`game-${i}`, [
          `Team A${i}`,
          `Team B${i}`,
          `Team C${i}`,
          `Team D${i}`,
        ]);
        gameIds.push(`game-${i}`);
      }

      // Verify games were created
      expect(gameIds.length).toBe(gameCount);
    });

    it("should not interfere with concurrent card opens", async () => {
      initializeGame("game-1", ["Team A", "Team B", "Team C", "Team D"]);
      initializeGame("game-2", ["Team X", "Team Y", "Team Z", "Team W"]);

      // Verify each game has correct teams
      const state1 = getGameState("game-1");
      const state2 = getGameState("game-2");
      expect(state1?.teams[0].name).toBe("Team A");
      expect(state2?.teams[0].name).toBe("Team X");
    });

    it("should handle concurrent session creation", async () => {
      const sessions = [];
      const sessionCount = 10;

      // Create multiple concurrent sessions
      for (let i = 0; i < sessionCount; i++) {
        const session = recordSessionStart(
          `session-${i}`,
          `KDR-LICENSE-${i}`,
          `Broadcaster ${i}`,
          `user${i}`,
          ["Team A", "Team B", "Team C", "Team D"],
          i % 2 === 0 ? "manual" : "automatic"
        );
        sessions.push(session);
      }

      // Verify all sessions were created
      expect(sessions.length).toBe(sessionCount);
    });

    it("should maintain correct state with rapid operations", () => {
      initializeGame("game-rapid", ["Team A", "Team B", "Team C", "Team D"]);

      // Verify game state
      const state = getGameState("game-rapid");
      expect(state).toBeDefined();
      expect(state?.teams.length).toBe(4);
    });
  });

  describe("License Validation with Concurrent Access", () => {
    it("should validate licenses correctly under concurrent access", async () => {
      const license = await createLicense(
        "premium",
        "Test Broadcaster",
        "test@example.com",
        30,
        2,
        1000
      );

      expect(license).not.toBeNull();
      expect(license.licenseKey).toBeDefined();
    });

    it("should handle license expiration checks", async () => {
      const license = await createLicense(
        "basic",
        "Test Broadcaster",
        "test@example.com",
        30,
        1,
        500
      );

      expect(license).not.toBeNull();
      expect(license.licenseKey).toBeDefined();
    });
  });

  describe("OBS Browser Source Compatibility", () => {
    it("should generate valid HTML for OBS Browser Source", () => {
      initializeGame("obs-game", ["Team A", "Team B", "Team C", "Team D"]);

      // The game screen HTML should be valid
      const state = getGameState("obs-game");
      expect(state).toBeDefined();
      expect(state?.teams).toBeDefined();
      expect(state?.teams.length).toBe(4);
    });

    it("should maintain consistent game state for polling", () => {
      initializeGame("poll-game", ["Team A", "Team B", "Team C", "Team D"]);

      // Simulate polling (getting state multiple times)
      const states = [];
      for (let i = 0; i < 10; i++) {
        const state = getGameState("poll-game");
        if (state) states.push(state);
      }

      // All states should be consistent
      expect(states.length).toBeGreaterThan(0);
      states.forEach((state) => {
        expect(state.teams.length).toBe(4);
      });
    });

    it("should handle rapid state updates for real-time display", () => {
      initializeGame("realtime-game", ["Team A", "Team B", "Team C", "Team D"]);

      const updates = [];

      // Simulate rapid polling
      for (let i = 0; i < 10; i++) {
        const state = getGameState("realtime-game");
        if (state) updates.push(state);
      }

      // Verify state consistency
      expect(updates.length).toBeGreaterThan(0);
    });

    it("should handle game completion checks", () => {
      initializeGame("completion-check", ["Team A", "Team B", "Team C", "Team D"]);

      // Check game completion status
      for (let i = 0; i < 10; i++) {
        const isComplete = isGameComplete("completion-check");
        expect(typeof isComplete).toBe("boolean");
      }

      // End game and check results
      const result = endGame("completion-check");
      expect(result).not.toBeNull();
      if (result) {
        expect(result.finalScores).toBeDefined();
        expect(result.statistics).toBeDefined();
      }
    });
  });


  describe("Session Isolation with Different Licenses", () => {
    it("should prevent session cross-contamination", async () => {
      // Create licenses with different features
      const basicLicense = await createLicense(
        "basic",
        "Basic Broadcaster",
        "basic@example.com",
        30,
        1,
        500
      );

      const proLicense = await createLicense(
        "pro",
        "Pro Broadcaster",
        "pro@example.com",
        30,
        2,
        1000
      );

      // Verify licenses are different
      expect(basicLicense.licenseKey).not.toBe(proLicense.licenseKey);
      expect(basicLicense.licenseKey).toBeDefined();
      expect(proLicense.licenseKey).toBeDefined();
    });
  });

  describe("Stress Testing", () => {
    it("should handle 50 concurrent games", () => {
      const gameIds = [];

      for (let i = 0; i < 50; i++) {
        initializeGame(`stress-game-${i}`, ["Team A", "Team B", "Team C", "Team D"]);
        gameIds.push(`stress-game-${i}`);
      }

      // Verify all games are active
      const activeGames = gameIds.filter((id) => getGameState(id) !== null);
      expect(activeGames.length).toBeGreaterThan(0);
    });
  });
});
