/**
 * Session history tracking for analytics and reporting
 */

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

/**
 * In-memory session history storage (in production, use database)
 */
const sessionHistory = new Map<string, SessionRecord>();
let sessionIdCounter = 1;

/**
 * Record session start
 */
export function recordSessionStart(
  sessionId: string,
  licenseKey: string,
  broadcasterName: string,
  tiktokUsername: string,
  teamNames: string[],
  teamSelectionMode: "manual" | "automatic"
): SessionRecord {
  const record: SessionRecord = {
    id: sessionIdCounter++,
    sessionId,
    licenseKey,
    broadcasterName,
    tiktokUsername,
    teamNames,
    teamSelectionMode,
    startedAt: new Date(),
    duration: 0,
    totalCardsOpened: 0,
    totalLikes: 0,
    totalGifts: 0,
    totalParticipants: 0,
    finalScores: [],
    status: "active",
  };

  sessionHistory.set(sessionId, record);
  console.log(`[SessionHistory] Oturum kaydedildi: ${sessionId}`);

  return record;
}

/**
 * Update session statistics
 */
export function updateSessionStats(
  sessionId: string,
  stats: {
    totalCardsOpened?: number;
    totalLikes?: number;
    totalGifts?: number;
    totalParticipants?: number;
  }
): boolean {
  const record = sessionHistory.get(sessionId);

  if (!record) {
    console.warn(`[SessionHistory] Oturum bulunamadı: ${sessionId}`);
    return false;
  }

  if (stats.totalCardsOpened !== undefined) {
    record.totalCardsOpened = stats.totalCardsOpened;
  }
  if (stats.totalLikes !== undefined) {
    record.totalLikes = stats.totalLikes;
  }
  if (stats.totalGifts !== undefined) {
    record.totalGifts = stats.totalGifts;
  }
  if (stats.totalParticipants !== undefined) {
    record.totalParticipants = stats.totalParticipants;
  }

  return true;
}

/**
 * Record session end
 */
export function recordSessionEnd(
  sessionId: string,
  finalScores: Array<{ teamName: string; score: number; players: number }>,
  notes?: string
): SessionRecord | null {
  const record = sessionHistory.get(sessionId);

  if (!record) {
    console.warn(`[SessionHistory] Oturum bulunamadı: ${sessionId}`);
    return null;
  }

  record.endedAt = new Date();
  record.duration = Math.floor(
    (record.endedAt.getTime() - record.startedAt.getTime()) / 1000
  );
  record.finalScores = finalScores;
  record.status = "completed";
  record.notes = notes;

  console.log(`[SessionHistory] Oturum tamamlandı: ${sessionId} (${record.duration}s)`);

  return record;
}

/**
 * Cancel session
 */
export function cancelSession(sessionId: string, reason?: string): boolean {
  const record = sessionHistory.get(sessionId);

  if (!record) {
    return false;
  }

  record.endedAt = new Date();
  record.duration = Math.floor(
    (record.endedAt.getTime() - record.startedAt.getTime()) / 1000
  );
  record.status = "cancelled";
  record.notes = reason;

  console.log(`[SessionHistory] Oturum iptal edildi: ${sessionId}`);

  return true;
}

/**
 * Get session history by ID
 */
export function getSessionHistory(sessionId: string): SessionRecord | null {
  return sessionHistory.get(sessionId) || null;
}

/**
 * Get all session history
 */
export function getAllSessionHistory(): SessionRecord[] {
  return Array.from(sessionHistory.values());
}

/**
 * Get session history by license key
 */
export function getSessionHistoryByLicense(licenseKey: string): SessionRecord[] {
  return Array.from(sessionHistory.values()).filter((s) => s.licenseKey === licenseKey);
}

/**
 * Get session history by broadcaster
 */
export function getSessionHistoryByBroadcaster(
  broadcasterName: string
): SessionRecord[] {
  return Array.from(sessionHistory.values()).filter(
    (s) => s.broadcasterName === broadcasterName
  );
}

/**
 * Get session statistics
 */
export function getSessionStatistics() {
  const all = Array.from(sessionHistory.values());
  const completed = all.filter((s) => s.status === "completed");
  const cancelled = all.filter((s) => s.status === "cancelled");
  const active = all.filter((s) => s.status === "active");

  const totalDuration = completed.reduce((sum, s) => sum + s.duration, 0);
  const totalCards = completed.reduce((sum, s) => sum + s.totalCardsOpened, 0);
  const totalLikes = completed.reduce((sum, s) => sum + s.totalLikes, 0);
  const totalGifts = completed.reduce((sum, s) => sum + s.totalGifts, 0);
  const totalParticipants = completed.reduce((sum, s) => sum + s.totalParticipants, 0);

  return {
    totalSessions: all.length,
    completedSessions: completed.length,
    cancelledSessions: cancelled.length,
    activeSessions: active.length,
    totalDuration,
    averageDuration: completed.length > 0 ? totalDuration / completed.length : 0,
    totalCards,
    averageCards: completed.length > 0 ? totalCards / completed.length : 0,
    totalLikes,
    totalGifts,
    totalParticipants,
    averageParticipants:
      completed.length > 0 ? totalParticipants / completed.length : 0,
  };
}

/**
 * Get top broadcasters
 */
export function getTopBroadcasters(limit: number = 10) {
  const broadcasters = new Map<
    string,
    { name: string; sessions: number; totalCards: number; totalLikes: number }
  >();

  const all = Array.from(sessionHistory.values()).filter((s) => s.status === "completed");

  all.forEach((session) => {
    const key = session.broadcasterName;
    if (!broadcasters.has(key)) {
      broadcasters.set(key, {
        name: session.broadcasterName,
        sessions: 0,
        totalCards: 0,
        totalLikes: 0,
      });
    }

    const stats = broadcasters.get(key)!;
    stats.sessions++;
    stats.totalCards += session.totalCardsOpened;
    stats.totalLikes += session.totalLikes;
  });

  return Array.from(broadcasters.values())
    .sort((a, b) => b.totalCards - a.totalCards)
    .slice(0, limit);
}

/**
 * Export session data for reporting
 */
export function exportSessionData(
  filters?: {
    licenseKey?: string;
    broadcasterName?: string;
    status?: "active" | "completed" | "cancelled";
    startDate?: Date;
    endDate?: Date;
  }
): SessionRecord[] {
  let records = Array.from(sessionHistory.values());

  if (filters) {
    if (filters.licenseKey) {
      records = records.filter((r) => r.licenseKey === filters.licenseKey);
    }
    if (filters.broadcasterName) {
      records = records.filter((r) => r.broadcasterName === filters.broadcasterName);
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
  }

  return records;
}

/**
 * Clear old session history (older than days)
 */
export function clearOldHistory(days: number = 30): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let removed = 0;
  sessionHistory.forEach((record, key) => {
    if (record.endedAt && record.endedAt < cutoffDate) {
      sessionHistory.delete(key);
      removed++;
    }
  });

  console.log(`[SessionHistory] ${removed} eski oturum silindi`);
  return removed;
}
