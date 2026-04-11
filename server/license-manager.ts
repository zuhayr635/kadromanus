import { nanoid } from "nanoid";
import { getDb } from "./db";
import { licenses as licensesTable } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * License package types and their default features
 */
const PACKAGE_FEATURES: Record<
  string,
  {
    name: string;
    price: number;
    telegram: boolean;
    autoMode: boolean;
    analytics: boolean;
    customTeams: boolean;
    multiSession: boolean;
    apiAccess: boolean;
  }
> = {
  basic: {
    name: "Basic",
    price: 99,
    telegram: false,
    autoMode: false,
    analytics: false,
    customTeams: false,
    multiSession: false,
    apiAccess: false,
  },
  pro: {
    name: "Pro",
    price: 299,
    telegram: true,
    autoMode: true,
    analytics: false,
    customTeams: true,
    multiSession: false,
    apiAccess: false,
  },
  premium: {
    name: "Premium",
    price: 599,
    telegram: true,
    autoMode: true,
    analytics: true,
    customTeams: true,
    multiSession: true,
    apiAccess: false,
  },
  unlimited: {
    name: "Unlimited",
    price: 999,
    telegram: true,
    autoMode: true,
    analytics: true,
    customTeams: true,
    multiSession: true,
    apiAccess: true,
  },
};

/**
 * Create a new license (persisted in DB)
 */
export async function createLicense(
  packageType: string,
  broadcasterName: string,
  broadcasterEmail: string,
  licenseDuration: number,
  maxSessions: number,
  maxPlayers: number,
  ownerTikTok?: string
): Promise<{ success: boolean; message: string; licenseKey?: string }> {
  try {
    if (!PACKAGE_FEATURES[packageType]) {
      return { success: false, message: "Gecersiz paket turu" };
    }

    const db = await getDb();
    if (!db) {
      return { success: false, message: "Veritabani baglantisi yok" };
    }

    const seg = () => Math.floor(1000 + Math.random() * 9000).toString();
    const licenseKey = `HIRA-${seg()}-${seg()}-${seg()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + licenseDuration * 24 * 60 * 60 * 1000);
    const features = PACKAGE_FEATURES[packageType];

    await db.insert(licensesTable).values({
      licenseKey,
      ownerName: broadcasterName,
      ownerEmail: broadcasterEmail,
      ownerTikTok: ownerTikTok || null,
      planType: packageType as "basic" | "pro" | "premium" | "unlimited",
      status: "active",
      maxSessions,
      allowedFeatures: {
        telegram: features.telegram,
        autoMode: features.autoMode,
        analytics: features.analytics,
        customTeams: features.customTeams,
        multiSession: features.multiSession,
        apiAccess: features.apiAccess,
        maxPlayers,
      },
      activatedAt: now,
      expiresAt,
    });

    console.log(`[License] Lisans olusturuldu: ${licenseKey} (${packageType})`);

    return { success: true, message: "Lisans basariyla olusturuldu", licenseKey };
  } catch (error) {
    console.error("[License] Lisans olusturma hatasi:", error);
    return { success: false, message: "Lisans olusturma basarisiz" };
  }
}

/**
 * Get license by key — returns a normalized object for backward compat
 */
export async function getLicenseByKey(licenseKey: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db
      .select()
      .from(licensesTable)
      .where(eq(licensesTable.licenseKey, licenseKey))
      .limit(1);

    if (rows.length === 0) return null;

    return normalizeLicense(rows[0]);
  } catch (error) {
    console.error("[License] getLicenseByKey hatasi:", error);
    return null;
  }
}

/**
 * Get all licenses
 */
export async function getAllLicenses() {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db.select().from(licensesTable);
    return rows.map(normalizeLicense);
  } catch (error) {
    console.error("[License] getAllLicenses hatasi:", error);
    return [];
  }
}

/**
 * Validate license — checks exists, active, not expired
 */
export async function validateLicense(licenseKey: string, tiktokUsername?: string): Promise<boolean> {
  const license = await getLicenseByKey(licenseKey);

  if (!license) {
    console.warn(`[License] Lisans bulunamadi: ${licenseKey}`);
    return false;
  }

  if (!license.isActive) {
    console.warn(`[License] Lisans deaktif: ${licenseKey}`);
    return false;
  }

  if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
    console.warn(`[License] Lisans suresi doldu: ${licenseKey}`);
    return false;
  }

  // TikTok kullanıcı adı kontrolü (eğer lisansa bağlıysa)
  if (license.ownerTikTok && tiktokUsername) {
    const licenseTikTok = license.ownerTikTok.replace('@', '').toLowerCase().trim();
    const requestTikTok = tiktokUsername.replace('@', '').toLowerCase().trim();
    if (licenseTikTok !== requestTikTok) {
      console.warn(`[License] TikTok kullanici eslesmiyor: ${licenseKey} - beklenen: @${license.ownerTikTok}, istenen: @${tiktokUsername}`);
      return false;
    }
  }

  return true;
}

/**
 * Validate license with detailed error message
 */
export async function validateLicenseWithMessage(licenseKey: string, tiktokUsername?: string): Promise<{ valid: boolean; message?: string }> {
  const license = await getLicenseByKey(licenseKey);

  if (!license) {
    return { valid: false, message: 'Lisans bulunamadı' };
  }

  if (!license.isActive) {
    return { valid: false, message: 'Lisans deaktif edilmiş' };
  }

  if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
    return { valid: false, message: 'Lisans süresi dolmuş' };
  }

  if (license.ownerTikTok && tiktokUsername) {
    const licenseTikTok = license.ownerTikTok.replace('@', '').toLowerCase().trim();
    const requestTikTok = tiktokUsername.replace('@', '').toLowerCase().trim();
    if (licenseTikTok !== requestTikTok) {
      return { valid: false, message: `Bu lisans sadece @${license.ownerTikTok} kullanıcısı içindir` };
    }
  }

  return { valid: true };
}

/**
 * Check if license is expired
 */
export async function isLicenseExpired(licenseKey: string): Promise<boolean> {
  const license = await getLicenseByKey(licenseKey);
  if (!license) return true;
  if (!license.expiresAt) return false;
  return new Date() > new Date(license.expiresAt);
}

/**
 * Get license features by package type (static config)
 */
export async function getLicenseFeatures(packageType: string) {
  const features = PACKAGE_FEATURES[packageType];
  if (!features) return null;

  return {
    packageType,
    name: features.name,
    price: features.price,
    features: {
      telegram: features.telegram,
      autoMode: features.autoMode,
      analytics: features.analytics,
      customTeams: features.customTeams,
      multiSession: features.multiSession,
      apiAccess: features.apiAccess,
    },
  };
}

/**
 * Update license features for a package — updates all DB rows with that planType
 */
export async function updateLicenseFeatures(
  packageType: string,
  features: Record<string, boolean>
): Promise<{ success: boolean; message: string }> {
  try {
    if (!PACKAGE_FEATURES[packageType]) {
      return { success: false, message: "Gecersiz paket turu" };
    }

    // Update static config
    PACKAGE_FEATURES[packageType] = {
      ...PACKAGE_FEATURES[packageType],
      ...features,
    };

    // Update all DB rows with this planType
    const db = await getDb();
    if (db) {
      const newFeatures = {
        telegram: features.telegram ?? false,
        autoMode: features.autoMode ?? false,
        analytics: features.analytics ?? false,
        customTeams: features.customTeams ?? false,
        multiSession: features.multiSession ?? false,
        apiAccess: features.apiAccess ?? false,
      };
      await db
        .update(licensesTable)
        .set({ allowedFeatures: newFeatures })
        .where(eq(licensesTable.planType, packageType as any));
    }

    console.log(`[License] Paket ozellikleri guncellendi: ${packageType}`);
    return { success: true, message: "Ozellikler basariyla guncellendi" };
  } catch (error) {
    console.error("[License] Ozellik guncelleme hatasi:", error);
    return { success: false, message: "Ozellik guncelleme basarisiz" };
  }
}

/**
 * Get license usage info
 */
export async function getLicenseUsage(licenseKey: string) {
  const license = await getLicenseByKey(licenseKey);
  if (!license) return null;

  const expiresAt = license.expiresAt ? new Date(license.expiresAt) : null;
  const now = new Date();

  return {
    licenseKey,
    packageType: license.packageType,
    broadcasterName: license.broadcasterName,
    maxSessions: license.maxSessions,
    maxPlayers: (license.features as any)?.maxPlayers ?? 11,
    expiresAt: license.expiresAt,
    daysRemaining: expiresAt
      ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0,
    isExpired: expiresAt ? now > expiresAt : false,
  };
}

/**
 * Deactivate license by key
 */
export async function deactivateLicense(licenseKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db
      .update(licensesTable)
      .set({ status: "suspended" })
      .where(eq(licensesTable.licenseKey, licenseKey));

    console.log(`[License] Lisans deaktif edildi: ${licenseKey}`);
    return true;
  } catch (error) {
    console.error("[License] deactivateLicense hatasi:", error);
    return false;
  }
}

/**
 * Reactivate license by key
 */
export async function reactivateLicense(licenseKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(licensesTable)
      .set({ status: "active" })
      .where(eq(licensesTable.licenseKey, licenseKey));

    console.log(`[License] Lisans aktif edildi: ${licenseKey}`);
    return true;
  } catch (error) {
    console.error("[License] reactivateLicense hatasi:", error);
    return false;
  }
}

/**
 * Extend license expiration date (by numeric DB id)
 */
export async function extendLicense(id: string, days: number) {
  const db = await getDb();
  if (!db) throw new Error("Veritabani baglantisi yok");

  const numericId = Number(id);
  if (Number.isNaN(numericId)) throw new Error("Gecersiz lisans ID");

  const rows = await db
    .select()
    .from(licensesTable)
    .where(eq(licensesTable.id, numericId))
    .limit(1);

  if (rows.length === 0) throw new Error("Lisans bulunamadi");

  const license = rows[0];
  const currentExpiry = license.expiresAt ? new Date(license.expiresAt) : new Date();
  currentExpiry.setDate(currentExpiry.getDate() + days);

  await db
    .update(licensesTable)
    .set({ expiresAt: currentExpiry })
    .where(eq(licensesTable.id, numericId));

  console.log(`[License] Lisans uzatildi: ${license.licenseKey} +${days} gun`);
  return { success: true, newExpiry: currentExpiry.toISOString() };
}

/**
 * Update license details
 */
export async function updateLicense(
  id: string,
  updates: {
    licenseKey?: string;
    username?: string;
    tiktokUsername?: string;
    expiresAt?: Date;
    usageCount?: number;
    permissions?: { autoMode?: boolean };
    packageId?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Veritabani baglantisi yok");

  const numericId = Number(id);
  if (Number.isNaN(numericId)) throw new Error("Gecersiz lisans ID");

  const current = await db
    .select()
    .from(licensesTable)
    .where(eq(licensesTable.id, numericId))
    .limit(1);

  if (current.length === 0) throw new Error("Lisans bulunamadi");

  const updateData: any = {};

  if (updates.licenseKey !== undefined) updateData.licenseKey = updates.licenseKey;
  if (updates.username !== undefined) updateData.ownerName = updates.username;
  if (updates.tiktokUsername !== undefined) updateData.ownerTikTok = updates.tiktokUsername;
  if (updates.expiresAt !== undefined) updateData.expiresAt = updates.expiresAt;
  if (updates.usageCount !== undefined) updateData.usageCount = updates.usageCount;
  if (updates.permissions?.autoMode !== undefined) {
    const existingFeatures = (current[0].allowedFeatures as Record<string, any>) ?? {};
    updateData.allowedFeatures = { ...existingFeatures, autoMode: updates.permissions.autoMode };
  }

  await db
    .update(licensesTable)
    .set(updateData)
    .where(eq(licensesTable.id, numericId));

  console.log(`[License] Lisans guncellendi: ${numericId}`);
  const updated = await db
    .select()
    .from(licensesTable)
    .where(eq(licensesTable.id, numericId))
    .limit(1);

  return normalizeLicense(updated[0]);
}

/**
 * Revoke license (by numeric DB id)
 */
export async function revokeLicense(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Veritabani baglantisi yok");

  const numericId = Number(id);
  if (Number.isNaN(numericId)) throw new Error("Gecersiz lisans ID");

  const rows = await db
    .select()
    .from(licensesTable)
    .where(eq(licensesTable.id, numericId))
    .limit(1);

  if (rows.length === 0) throw new Error("Lisans bulunamadi");

  await db
    .update(licensesTable)
    .set({ status: "revoked" })
    .where(eq(licensesTable.id, numericId));

  console.log(`[License] Lisans iptal edildi: ${rows[0].licenseKey}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Internal: normalize a DB row to the shape callers expect
// ---------------------------------------------------------------------------

function normalizeLicense(row: any) {
  const features = (row.allowedFeatures as Record<string, any>) ?? {};
  const isActive = row.status === "active";

  return {
    id: row.id,
    key: row.licenseKey,
    licenseKey: row.licenseKey,
    packageType: row.planType,
    broadcasterName: row.ownerName,
    broadcasterEmail: row.ownerEmail ?? "",
    ownerTikTok: row.ownerTikTok ?? null,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    maxSessions: row.maxSessions ?? 1,
    maxPlayers: features.maxPlayers ?? 11,
    isActive,
    status: row.status,
    features: {
      telegram: features.telegram ?? false,
      autoMode: features.autoMode ?? false,
      analytics: features.analytics ?? false,
      customTeams: features.customTeams ?? false,
      multiSession: features.multiSession ?? false,
      apiAccess: features.apiAccess ?? false,
    },
  };
}
