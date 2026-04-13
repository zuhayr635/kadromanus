import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createBroadcasterSession,
  endBroadcasterSession,
  getBroadcasterSession,
  updateTeamSelectionMode,
  processTeamSelectionCommand,
} from "../broadcaster-session";
import { startSession, stopSession, assignPendingCard, skipPendingCardSocket } from "../socket-server";
import { getLikeThreshold, setLikeThreshold, getDiamondThresholds, setDiamondThresholds } from "../game-engine";

export const broadcasterRouter = router({
  /**
   * Create a new broadcaster session
   */
  createSession: publicProcedure
    .input(
      z.object({
        licenseKey: z.string().min(1),
        tiktokUsername: z.string().min(1),
        teamSelectionMode: z.enum(["manual", "automatic"]),
        teamNames: z.array(z.string()).length(4),
      })
    )
    .mutation(async ({ input }) => {
      const result = await createBroadcasterSession(
        input.licenseKey,
        input.tiktokUsername,
        input.teamNames,
        input.teamSelectionMode
      );

      if (result.success && result.sessionId) {
        // startSession TikTok bağlantısı zorunlu, başarısız olursa hata fırlatır
        await startSession(result.sessionId, input.tiktokUsername, input.teamNames);
      }

      return result;
    }),

  /**
   * Get broadcaster session details
   */
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const session = getBroadcasterSession(input.sessionId);
      return session || null;
    }),

  /**
   * Update team selection mode
   */
  updateMode: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        mode: z.enum(["manual", "automatic"]),
      })
    )
    .mutation(async ({ input }) => {
      const success = await updateTeamSelectionMode(input.sessionId, input.mode);
      return {
        success,
        message: success ? "Mod başarıyla güncellendi" : "Mod güncelleme başarısız",
      };
    }),

  /**
   * Process team selection command (for automatic mode)
   */
  selectTeam: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        command: z.string(),
      })
    )
    .mutation(({ input }) => {
      const result = processTeamSelectionCommand(input.sessionId, input.command);
      return result;
    }),

  /**
   * End broadcaster session
   */
  endSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      await stopSession(input.sessionId);
      const success = await endBroadcasterSession(input.sessionId);
      return {
        success,
        message: success ? "Oturum sonlandırıldı" : "Oturum sonlandırma başarısız",
      };
    }),

  /**
   * Assign pending card to a team (team selection step)
   */
  assignPendingCard: publicProcedure
    .input(z.object({ sessionId: z.string(), teamId: z.number().int().min(0) }))
    .mutation(async ({ input }) => {
      const success = await assignPendingCard(input.sessionId, input.teamId);
      return { success, message: success ? "Kart takıma atandı" : "Bekleyen kart bulunamadı" };
    }),

  /**
   * Skip (discard) the current pending card
   */
  skipPendingCard: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => {
      const success = skipPendingCardSocket(input.sessionId);
      return { success };
    }),

  /**
   * Get like threshold (how many likes = 1 bronze card)
   */
  getLikeThreshold: publicProcedure.query(() => {
    return { threshold: getLikeThreshold() };
  }),

  /**
   * Set like threshold (admin-only)
   */
  setLikeThreshold: adminProcedure
    .input(z.object({ threshold: z.number().min(1).max(100000) }))
    .mutation(({ input }) => {
      setLikeThreshold(input.threshold);
      return { success: true };
    }),

  /**
   * Get diamond (coin) thresholds for card quality
   */
  getDiamondThresholds: publicProcedure.query(() => {
    return getDiamondThresholds();
  }),

  /**
   * Set diamond thresholds (admin-only)
   */
  setDiamondThresholds: adminProcedure
    .input(
      z.object({
        silver: z.number().int().min(1),
        gold: z.number().int().min(1),
        elite: z.number().int().min(1),
      })
    )
    .mutation(({ input }) => {
      setDiamondThresholds(input);
      return { success: true };
    }),

});

