import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getSessionHistory,
  getAllSessionHistory,
  getSessionHistoryByLicense,
  getSessionHistoryByBroadcaster,
  getSessionStatistics,
  getTopBroadcasters,
  exportSessionData,
  clearOldHistory,
} from "../session-history";

export const adminRouter = router({
  /**
   * Get session history by ID
   */
  getSessionHistory: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const history = getSessionHistory(input.sessionId);
      return history || null;
    }),

  /**
   * Get all session history
   */
  getAllSessions: adminProcedure.query(() => {
    return getAllSessionHistory();
  }),

  /**
   * Get session history by license key
   */
  getSessionsByLicense: adminProcedure
    .input(z.object({ licenseKey: z.string() }))
    .query(({ input }) => {
      return getSessionHistoryByLicense(input.licenseKey);
    }),

  /**
   * Get session history by broadcaster
   */
  getSessionsByBroadcaster: adminProcedure
    .input(z.object({ broadcasterName: z.string() }))
    .query(({ input }) => {
      return getSessionHistoryByBroadcaster(input.broadcasterName);
    }),

  /**
   * Get overall statistics
   */
  getStatistics: adminProcedure.query(() => {
    return getSessionStatistics();
  }),

  /**
   * Get top broadcasters
   */
  getTopBroadcasters: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }))
    .query(({ input }) => {
      return getTopBroadcasters(input.limit || 10);
    }),

  /**
   * Export session data with filters
   */
  exportData: adminProcedure
    .input(
      z.object({
        licenseKey: z.string().optional(),
        broadcasterName: z.string().optional(),
        status: z.enum(["active", "completed", "cancelled"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(({ input }) => {
      const filters: any = {};

      if (input.licenseKey) filters.licenseKey = input.licenseKey;
      if (input.broadcasterName) filters.broadcasterName = input.broadcasterName;
      if (input.status) filters.status = input.status;
      if (input.startDate) filters.startDate = new Date(input.startDate);
      if (input.endDate) filters.endDate = new Date(input.endDate);

      return exportSessionData(Object.keys(filters).length > 0 ? filters : undefined);
    }),

  /**
   * Clear old history
   */
  clearOldHistory: adminProcedure
    .input(z.object({ days: z.number().min(1).optional() }))
    .mutation(({ input }) => {
      const removed = clearOldHistory(input.days || 30);
      return {
        success: true,
        message: `${removed} eski oturum silindi`,
        removed,
      };
    }),
});
