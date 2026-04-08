import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getGameState, isGameComplete, endGame } from "../game-engine";

export const gameRouter = router({
  /**
   * Get current game state
   */
  getState: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const gameState = getGameState(input.sessionId);

      if (!gameState) {
        return null;
      }

      return {
        sessionId: gameState.sessionId,
        teams: gameState.teams.map((team) => ({
          id: team.id,
          name: team.name,
          score: team.score,
          players: team.players,
        })),
        openedCards: gameState.openedCards,
        pendingCard: gameState.pendingCard ?? null,
        totalLikes: gameState.totalLikes,
        totalGifts: gameState.totalGifts,
        participants: Array.from(gameState.participants),
        isComplete: isGameComplete(input.sessionId),
        startedAt: gameState.startedAt,
        endedAt: gameState.endedAt,
      };
    }),

  /**
   * Get final game scores
   */
  getFinalScores: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const result = endGame(input.sessionId);

      if (!result) {
        return null;
      }

      return result;
    }),

  /**
   * Check if game is complete
   */
  isComplete: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      return isGameComplete(input.sessionId);
    }),
});
