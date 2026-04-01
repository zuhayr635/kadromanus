import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createBroadcasterSession,
  endBroadcasterSession,
  getBroadcasterSession,
  updateTeamSelectionMode,
  processTeamSelectionCommand,
} from "../broadcaster-session";
import { startSession, stopSession } from "../socket-server";

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
        try {
          await startSession(result.sessionId, input.tiktokUsername, input.teamNames);
        } catch (error) {
          console.error(`[${result.sessionId}] startSession hatası:`, error);
          throw new Error(`TikTok bağlantısı başlatılamadı: ${(error as Error).message}`);
        }
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
});
