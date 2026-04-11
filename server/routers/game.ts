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
   * Get final game scores (read-only — does NOT end the game)
   */
  getFinalScores: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const gameState = getGameState(input.sessionId);

      if (!gameState || !gameState.endedAt) {
        return null;
      }

      // Compute scores from already-ended game state
      const finalScores = gameState.teams.map((team) => ({
        teamName: team.name,
        score: team.score,
        players: team.players.length,
      }));

      const statistics = {
        totalCardsOpened: gameState.openedCards.length,
        totalParticipants: gameState.participants.size,
        durationSeconds: Math.floor((gameState.endedAt - gameState.startedAt) / 1000),
      };

      return { finalScores, statistics };
    }),

  /**
   * End game manually (mutation)
   */
  endGame: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => {
      const result = endGame(input.sessionId);
      return result || { finalScores: [], statistics: { totalCardsOpened: 0, totalParticipants: 0, durationSeconds: 0 } };
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
