import { nanoid } from "nanoid";
import { getLicenseByKey } from "./license-manager";

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
 * Validate broadcaster license using in-memory license store
 */
export async function validateLicense(licenseKey: string, tiktokUsername?: string): Promise<{
  valid: boolean;
  licenseId?: number;
  message: string;
}> {
  const license = await getLicenseByKey(licenseKey);

  if (!license) {
    return { valid: false, message: "Lisans anahtarı bulunamadı" };
  }

  if (!license.isActive) {
    return { valid: false, message: "Lisans deaktif" };
  }

  if (new Date() > license.expiresAt) {
    return { valid: false, message: "Lisans süresi dolmuş" };
  }

  // TikTok kullanıcı adı kontrolü (eğer lisansa bağlıysa)
  if (license.ownerTikTok && tiktokUsername) {
    const licenseTikTok = license.ownerTikTok.replace('@', '').toLowerCase().trim();
    const requestTikTok = tiktokUsername.replace('@', '').toLowerCase().trim();
    if (licenseTikTok !== requestTikTok) {
      return { valid: false, message: `Bu lisans sadece @${license.ownerTikTok} kullanıcısı içindir` };
    }
  }

  return { valid: true, licenseId: license.id, message: "Lisans geçerli" };
}

/**
 * Create a new broadcaster session (in-memory only)
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
  const validation = await validateLicense(licenseKey);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  const sessionId = nanoid(16);
  const licenseId = validation.licenseId!;

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
  console.log(`[${sessionId}] Takım seçim modu değiştirildi: ${mode}`);
  return true;
}

/**
 * End broadcaster session
 */
export async function endBroadcasterSession(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  activeSessions.delete(sessionId);
  console.log(`[${sessionId}] Yayıncı oturumu sonlandırıldı`);
  return true;
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
