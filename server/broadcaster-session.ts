import { getDb } from "./db";
import { sessions, licenses } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface BroadcasterSession {
  sessionId: string;
  licenseId: number;
  tiktokUsername: string;
  teamSelectionMode: "manual" | "automatic";
  teamNames: string[];
  isActive: boolean;
  createdAt: number;
}

const activeSessions = new Map<string, BroadcasterSession>();

/**
 * Validate broadcaster license
 */
export async function validateLicense(licenseKey: string): Promise<{
  valid: boolean;
  licenseId?: number;
  message: string;
}> {
  const db = await getDb();
  if (!db) {
    return { valid: false, message: "Veritabanı bağlantısı başarısız" };
  }

  try {
    const result = await db
      .select()
      .from(licenses)
      .where(eq(licenses.licenseKey, licenseKey))
      .limit(1);

    if (result.length === 0) {
      return { valid: false, message: "Lisans anahtarı bulunamadı" };
    }

    const license = result[0];

    // Check if license is active
    if (license.status !== "active") {
      return {
        valid: false,
        message: `Lisans durumu: ${license.status}`,
      };
    }

    // Check if license is expired
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return { valid: false, message: "Lisans süresi dolmuş" };
    }

    // Check max sessions
    const activeBroadcasterSessions = Array.from(activeSessions.values()).filter(
      (s) => s.licenseId === license.id
    );

    if (activeBroadcasterSessions.length >= license.maxSessions) {
      return {
        valid: false,
        message: `Maksimum oturum sayısına ulaşıldı (${license.maxSessions})`,
      };
    }

    return { valid: true, licenseId: license.id, message: "Lisans geçerli" };
  } catch (error) {
    console.error("Lisans doğrulama hatası:", error);
    return { valid: false, message: "Lisans doğrulama sırasında hata oluştu" };
  }
}

/**
 * Create a new broadcaster session
 */
export async function createBroadcasterSession(
  licenseKey: string,
  tiktokUsername: string,
  teamNames: string[],
  teamSelectionMode: "manual" | "automatic" = "manual"
): Promise<{
  success: boolean;
  sessionId?: string;
  message: string;
}> {
  // Validate license
  const validation = await validateLicense(licenseKey);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const db = await getDb();
  if (!db) {
    return { success: false, message: "Veritabanı bağlantısı başarısız" };
  }

  try {
    const sessionId = nanoid(16);
    const licenseId = validation.licenseId!;

    // Create session in database
    await db.insert(sessions).values({
      sessionId,
      licenseId,
      tiktokUsername,
      status: "active",
      gameState: JSON.stringify({}),
      teamSettings: JSON.stringify({
        mode: teamSelectionMode,
        teamNames,
      }),
      gameSettings: JSON.stringify({}),
    });

    // Store in memory
    const broadcasterSession: BroadcasterSession = {
      sessionId,
      licenseId,
      tiktokUsername,
      teamSelectionMode,
      teamNames,
      isActive: true,
      createdAt: Date.now(),
    };

    activeSessions.set(sessionId, broadcasterSession);

    console.log(
      `[${sessionId}] Yayıncı oturumu oluşturuldu: ${tiktokUsername} (${teamSelectionMode} mod)`
    );

    return {
      success: true,
      sessionId,
      message: "Oturum başarıyla oluşturuldu",
    };
  } catch (error) {
    console.error("Oturum oluşturma hatası:", error);
    return { success: false, message: "Oturum oluşturma sırasında hata oluştu" };
  }
}

/**
 * Get broadcaster session
 */
export function getBroadcasterSession(
  sessionId: string
): BroadcasterSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Update team selection mode
 */
export async function updateTeamSelectionMode(
  sessionId: string,
  mode: "manual" | "automatic"
): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  session.teamSelectionMode = mode;

  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(sessions)
      .set({
        teamSettings: JSON.stringify({
          mode,
          teamNames: session.teamNames,
        }),
      })
      .where(eq(sessions.sessionId, sessionId));

    console.log(`[${sessionId}] Takım seçim modu değiştirildi: ${mode}`);
    return true;
  } catch (error) {
    console.error(`[${sessionId}] Mod değiştirme hatası:`, error);
    return false;
  }
}

/**
 * End broadcaster session
 */
export async function endBroadcasterSession(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(sessions)
      .set({
        status: "ended",
        endedAt: new Date(),
      })
      .where(eq(sessions.sessionId, sessionId));

    activeSessions.delete(sessionId);

    console.log(`[${sessionId}] Yayıncı oturumu sonlandırıldı`);
    return true;
  } catch (error) {
    console.error(`[${sessionId}] Oturum sonlandırma hatası:`, error);
    return false;
  }
}

/**
 * Get all active sessions for a license
 */
export function getActiveLicenseSessions(licenseId: number): BroadcasterSession[] {
  return Array.from(activeSessions.values()).filter(
    (s) => s.licenseId === licenseId
  );
}

/**
 * Get all active sessions
 */
export function getAllActiveSessions(): BroadcasterSession[] {
  return Array.from(activeSessions.values());
}

/**
 * Process chat command for automatic team selection
 */
export function processTeamSelectionCommand(
  sessionId: string,
  command: string
): { teamId?: number; valid: boolean; message: string } {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return { valid: false, message: "Oturum bulunamadı" };
  }

  if (session.teamSelectionMode !== "automatic") {
    return { valid: false, message: "Otomatik mod etkin değil" };
  }

  // Parse command like "!1", "!2", "!3", "!4"
  const match = command.match(/^!(\d+)$/);
  if (!match) {
    return { valid: false, message: "Geçersiz komut formatı" };
  }

  const teamId = parseInt(match[1], 10) - 1; // Convert to 0-indexed

  if (teamId < 0 || teamId >= session.teamNames.length) {
    return {
      valid: false,
      message: `Geçersiz takım numarası. Lütfen !1 ile !${session.teamNames.length} arasında bir komut kullanın`,
    };
  }

  return {
    valid: true,
    teamId,
    message: `${session.teamNames[teamId]} takımı seçildi`,
  };
}
