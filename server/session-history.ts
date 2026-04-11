/**
 * Session history tracking — persisted in MySQL via Drizzle ORM.
 *
 * Uses the `sessions` and `gameHistory` tables defined in drizzle/schema.ts.
 * All public functions are async because they hit the database.
 */

import { getDb } from "./db";
import { sessions, gameHistory } from "../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// ---- Normalized return type (backward compatible) ----
interface SessionRecord {
  id: number;
  sessionId: string;
  licenseKey: string;
  broadcasterName: string;
  tiktokUsername: string;
  teamNames: string[];
  teamSelectionMode: "manual" | "automatic";
  startedAt: Date;
  endedAt?: Date;
  duration: number; // seconds
  totalCardsOpened: number;
  totalLikes: number;
  totalGifts: number;
  totalParticipants: number;
  finalScores: Array<{
    teamName: string;
    score: number;
    players: number;
  }>;
  status: "active" | "completed" | "cancelled";
  notes?: string;
}

// ---- Helpers ----

function normalizeSession(row: any, historyRow?: any): SessionRecord {
  const teamSettings = (row.teamSettings as any) ?? {};
  const gameState = (row.gameState as any) ?? {};
  const startedAt = row.startedAt ? new Date(row.startedAt) : new Date();
  const endedAt = row.endedAt ? new Date(row.endedAt) : undefined;

  // Map DB status to SessionRecord status
  let status: "active" | "completed" | "cancelled" = "active";
  if (row.status === "ended") status = "completed";
  else if (row.status === "error") status = "cancelled";
  else if (row.status === "paused") status = "active";

  return {
    id: row.id,
    sessionId: row.sessionId,
    licenseKey: teamSettings.licenseKey ?? "",
    broadcasterName: teamSettings.broadcasterName ?? row.tiktokUsername,
    tiktokUsername: row.tiktokUsername,
    teamNames: teamSettings.teamNames ?? [],
    teamSelectionMode: teamSettings.teamSelectionMode ?? "manual",
    startedAt,
    endedAt,
    duration: endedAt
      ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
      : 0,
    totalCardsOpened: historyRow?.totalCardsOpened ?? gameState.totalCardsOpened ?? 0,
    totalLikes: gameState.totalLikes ?? 0,
    totalGifts: gameState.totalGifts ?? 0,
    totalParticipants: historyRow?.totalParticipants ?? gameState.totalParticipants ?? 0,
    finalScores: historyRow?.finalScores ?? gameState.finalScores ?? [],
    status,
    notes: teamSettings.notes,
  };
}

// ---- Public API ----

/**
 * Record session start — inserts a row into the `sessions` table.
 */
export async function recordSessionStart(
  sessionId: string,
  licenseKey: string,
  broadcasterName: string,
  tiktokUsername: string,
  teamNames: string[],
  teamSelectionMode: "manual" | "automatic"
): Promise<SessionRecord | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[SessionHistory] DB not available — cannot record session start");
    return null;
  }

  try {
    // Find licenseId by key (best-effort; default to 0 if not found)
    let licenseId = 0;
    try {
      const { licenses: licensesTable } = await import("../drizzle/schema");
      const lic = await db.select({ id: licensesTable.id }).from(licensesTable).where(eq(licensesTable.licenseKey, licenseKey)).limit(1);
      if (lic.length > 0) licenseId = lic[0].id;
    } catch { /* ignore */ }

    await db.insert(sessions).values({
      sessionId,
      licenseId,
      tiktokUsername,
      status: "active",
      teamSettings: { licenseKey, broadcasterName, teamNames, teamSelectionMode },
      gameState: { totalCardsOpened: 0, totalLikes: 0, totalGifts: 0, totalParticipants: 0 },
    });

    console.log(`[SessionHistory] Oturum kaydedildi: ${sessionId}`);

    const rows = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1);
    return rows.length > 0 ? normalizeSession(rows[0]) : null;
  } catch (error) {
    console.error("[SessionHistory] recordSessionStart hatasi:", error);
    return null;
  }
}

/**
 * Update session statistics (in-flight updates)
 */
export async function updateSessionStats(
  sessionId: string,
  stats: {
    totalCardsOpened?: number;
    totalLikes?: number;
    totalGifts?: number;
    totalParticipants?: number;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const rows = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1);
    if (rows.length === 0) return false;

    const current = (rows[0].gameState as any) ?? {};
    const updated = {
      ...current,
      ...(stats.totalCardsOpened !== undefined && { totalCardsOpened: stats.totalCardsOpened }),
      ...(stats.totalLikes !== undefined && { totalLikes: stats.totalLikes }),
      ...(stats.totalGifts !== undefined && { totalGifts: stats.totalGifts }),
      ...(stats.totalParticipants !== undefined && { totalParticipants: stats.totalParticipants }),
    };

    await db.update(sessions).set({ gameState: updated }).where(eq(sessions.sessionId, sessionId));
    return true;
  } catch (error) {
    console.error("[SessionHistory] updateSessionStats hatasi:", error);
    return false;
  }
}

/**
 * Record session end — updates session row + inserts a gameHistory row.
 */
export async function recordSessionEnd(
  sessionId: string,
  finalScores: Array<{ teamName: string; score: number; players: number }>,
  notes?: string
): Promise<SessionRecord | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[SessionHistory] DB not available — cannot record session end");
    return null;
  }

  try {
    const rows = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1);
    if (rows.length === 0) return null;

    const row = rows[0];
    const startedAt = row.startedAt ? new Date(row.startedAt) : new Date();
    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    const gameState = (row.gameState as any) ?? {};

    // Update session row
    const updatedGameState = { ...gameState, finalScores, notes };
    await db
      .update(sessions)
      .set({ status: "ended", endedAt, gameState: updatedGameState })
      .where(eq(sessions.sessionId, sessionId));

    // Insert gameHistory row
    const totalCardsOpened = gameState.totalCardsOpened ?? 0;
    const totalParticipants = gameState.totalParticipants ?? 0;

    await db.insert(gameHistory).values({
      sessionId,
      licenseId: row.licenseId,
      tiktokUsername: row.tiktokUsername,
      finalScores,
      statistics: {
        totalLikes: gameState.totalLikes ?? 0,
        totalGifts: gameState.totalGifts ?? 0,
      },
      durationSeconds,
      totalCardsOpened,
      totalParticipants,
    });

    console.log(`[SessionHistory] Oturum tamamlandi: ${sessionId} (${durationSeconds}s)`);

    // Return normalized record
    const updated = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1);
    return updated.length > 0 ? normalizeSession(updated[0]) : null;
  } catch (error) {
    console.error("[SessionHistory] recordSessionEnd hatasi:", error);
    return null;
  }
}

/**
 * Cancel session
 */
export async function cancelSession(sessionId: string, reason?: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const endedAt = new Date();
    await db
      .update(sessions)
      .set({
        status: "error",
        endedAt,
        gameState: sql`JSON_SET(COALESCE(${sessions.gameState}, '{}'), '$.notes', ${reason ?? "Cancelled"})`,
      })
      .where(eq(sessions.sessionId, sessionId));

    console.log(`[SessionHistory] Oturum iptal edildi: ${sessionId}`);
    return true;
  } catch (error) {
    console.error("[SessionHistory] cancelSession hatasi:", error);
    return false;
  }
}

/**
 * Get session history by ID
 */
export async function getSessionHistory(sessionId: string): Promise<SessionRecord | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1);
    if (rows.length === 0) return null;

    // Try to join gameHistory
    const historyRows = await db.select().from(gameHistory).where(eq(gameHistory.sessionId, sessionId)).limit(1);
    return normalizeSession(rows[0], historyRows[0]);
  } catch (error) {
    console.error("[SessionHistory] getSessionHistory hatasi:", error);
    return null;
  }
}

/**
 * Get all session history
 */
export async function getAllSessionHistory(): Promise<SessionRecord[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db.select().from(sessions).orderBy(desc(sessions.startedAt));
    return rows.map((r) => normalizeSession(r));
  } catch (error) {
    console.error("[SessionHistory] getAllSessionHistory hatasi:", error);
    return [];
  }
}

/**
 * Get session history by license key (searches teamSettings JSON)
 */
export async function getSessionHistoryByLicense(licenseKey: string): Promise<SessionRecord[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Find licenseId by key
    const { licenses: licensesTable } = await import("../drizzle/schema");
    const lic = await db.select({ id: licensesTable.id }).from(licensesTable).where(eq(licensesTable.licenseKey, licenseKey)).limit(1);
    if (lic.length === 0) return [];

    const rows = await db.select().from(sessions).where(eq(sessions.licenseId, lic[0].id)).orderBy(desc(sessions.startedAt));
    return rows.map((r) => normalizeSession(r));
  } catch (error) {
    console.error("[SessionHistory] getSessionHistoryByLicense hatasi:", error);
    return [];
  }
}

/**
 * Get session history by broadcaster (tiktokUsername)
 */
export async function getSessionHistoryByBroadcaster(broadcasterName: string): Promise<SessionRecord[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.tiktokUsername, broadcasterName))
      .orderBy(desc(sessions.startedAt));
    return rows.map((r) => normalizeSession(r));
  } catch (error) {
    console.error("[SessionHistory] getSessionHistoryByBroadcaster hatasi:", error);
    return [];
  }
}

/**
 * Get session statistics (aggregate)
 */
export async function getSessionStatistics() {
  const db = await getDb();
  if (!db) {
    return {
      totalSessions: 0, completedSessions: 0, cancelledSessions: 0, activeSessions: 0,
      totalDuration: 0, averageDuration: 0, totalCards: 0, averageCards: 0,
      totalLikes: 0, totalGifts: 0, totalParticipants: 0, averageParticipants: 0,
    };
  }

  try {
    const all = await db.select().from(sessions);
    const completed = all.filter((r) => r.status === "ended");
    const cancelled = all.filter((r) => r.status === "error");
    const active = all.filter((r) => r.status === "active" || r.status === "paused");

    let totalDuration = 0;
    let totalCards = 0;
    let totalLikes = 0;
    let totalGifts = 0;
    let totalParticipants = 0;

    for (const row of completed) {
      const gs = (row.gameState as any) ?? {};
      const start = row.startedAt ? new Date(row.startedAt).getTime() : 0;
      const end = row.endedAt ? new Date(row.endedAt).getTime() : Date.now();
      totalDuration += Math.floor((end - start) / 1000);
      totalCards += gs.totalCardsOpened ?? 0;
      totalLikes += gs.totalLikes ?? 0;
      totalGifts += gs.totalGifts ?? 0;
      totalParticipants += gs.totalParticipants ?? 0;
    }

    const n = completed.length || 1; // avoid /0

    return {
      totalSessions: all.length,
      completedSessions: completed.length,
      cancelledSessions: cancelled.length,
      activeSessions: active.length,
      totalDuration,
      averageDuration: Math.round(totalDuration / n),
      totalCards,
      averageCards: Math.round(totalCards / n),
      totalLikes,
      totalGifts,
      totalParticipants,
      averageParticipants: Math.round(totalParticipants / n),
    };
  } catch (error) {
    console.error("[SessionHistory] getSessionStatistics hatasi:", error);
    return {
      totalSessions: 0, completedSessions: 0, cancelledSessions: 0, activeSessions: 0,
      totalDuration: 0, averageDuration: 0, totalCards: 0, averageCards: 0,
      totalLikes: 0, totalGifts: 0, totalParticipants: 0, averageParticipants: 0,
    };
  }
}

/**
 * Get top broadcasters
 */
export async function getTopBroadcasters(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, "ended"));

    const broadcasters = new Map<string, { name: string; sessions: number; totalCards: number; totalLikes: number }>();

    for (const row of rows) {
      const gs = (row.gameState as any) ?? {};
      const key = row.tiktokUsername;

      if (!broadcasters.has(key)) {
        broadcasters.set(key, { name: key, sessions: 0, totalCards: 0, totalLikes: 0 });
      }
      const stats = broadcasters.get(key)!;
      stats.sessions++;
      stats.totalCards += gs.totalCardsOpened ?? 0;
      stats.totalLikes += gs.totalLikes ?? 0;
    }

    return Array.from(broadcasters.values())
      .sort((a, b) => b.totalCards - a.totalCards)
      .slice(0, limit);
  } catch (error) {
    console.error("[SessionHistory] getTopBroadcasters hatasi:", error);
    return [];
  }
}

/**
 * Export session data for reporting (with optional filters)
 */
export async function exportSessionData(
  filters?: {
    licenseKey?: string;
    broadcasterName?: string;
    status?: "active" | "completed" | "cancelled";
    startDate?: Date;
    endDate?: Date;
  }
): Promise<SessionRecord[]> {
  const all = await getAllSessionHistory();
  if (!filters) return all;

  let records = all;
  if (filters.licenseKey) {
    records = records.filter((r) => r.licenseKey === filters.licenseKey);
  }
  if (filters.broadcasterName) {
    records = records.filter((r) => r.broadcasterName === filters.broadcasterName || r.tiktokUsername === filters.broadcasterName);
  }
  if (filters.status) {
    records = records.filter((r) => r.status === filters.status);
  }
  if (filters.startDate) {
    records = records.filter((r) => r.startedAt >= filters.startDate!);
  }
  if (filters.endDate) {
    records = records.filter((r) => r.startedAt <= filters.endDate!);
  }

  return records;
}

/**
 * Clear old session history (older than N days)
 */
export async function clearOldHistory(days: number = 30): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // Count before delete
    const old = await db.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.status, "ended"), lte(sessions.endedAt, cutoff)));
    const count = old.length;

    if (count > 0) {
      await db.delete(sessions).where(and(eq(sessions.status, "ended"), lte(sessions.endedAt, cutoff)));
    }

    console.log(`[SessionHistory] ${count} eski oturum silindi`);
    return count;
  } catch (error) {
    console.error("[SessionHistory] clearOldHistory hatasi:", error);
    return 0;
  }
}
