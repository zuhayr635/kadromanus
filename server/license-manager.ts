import { nanoid } from "nanoid";

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
 * In-memory license storage (in production, use database)
 */
const licenses = new Map<
  string,
  {
    id: number;
    key: string;
    packageType: string;
    broadcasterName: string;
    broadcasterEmail: string;
    createdAt: Date;
    expiresAt: Date;
    maxSessions: number;
    maxPlayers: number;
    isActive: boolean;
    features: Record<string, boolean>;
  }
>();

let licenseIdCounter = 1;

/**
 * Create a new license
 */
export async function createLicense(
  packageType: string,
  broadcasterName: string,
  broadcasterEmail: string,
  licenseDuration: number,
  maxSessions: number,
  maxPlayers: number
): Promise<{ success: boolean; message: string; licenseKey?: string }> {
  try {
    if (!PACKAGE_FEATURES[packageType]) {
      return {
        success: false,
        message: "Geçersiz paket türü",
      };
    }

    const licenseKey = `HIRA-${nanoid(16).toUpperCase()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + licenseDuration * 24 * 60 * 60 * 1000);

    const features = PACKAGE_FEATURES[packageType];

    licenses.set(licenseKey, {
      id: licenseIdCounter++,
      key: licenseKey,
      packageType,
      broadcasterName,
      broadcasterEmail,
      createdAt: now,
      expiresAt,
      maxSessions,
      maxPlayers,
      isActive: true,
      features: {
        telegram: features.telegram,
        autoMode: features.autoMode,
        analytics: features.analytics,
        customTeams: features.customTeams,
        multiSession: features.multiSession,
        apiAccess: features.apiAccess,
      },
    });

    console.log(`[License] Lisans oluşturuldu: ${licenseKey} (${packageType})`);

    return {
      success: true,
      message: "Lisans başarıyla oluşturuldu",
      licenseKey,
    };
  } catch (error) {
    console.error("[License] Lisans oluşturma hatası:", error);
    return {
      success: false,
      message: "Lisans oluşturma başarısız",
    };
  }
}

/**
 * Get license by key
 */
export async function getLicenseByKey(licenseKey: string) {
  return licenses.get(licenseKey) || null;
}

/**
 * Get all licenses
 */
export async function getAllLicenses() {
  return Array.from(licenses.values());
}

/**
 * Validate license
 */
export async function validateLicense(licenseKey: string): Promise<boolean> {
  const license = licenses.get(licenseKey);

  if (!license) {
    console.warn(`[License] Lisans bulunamadı: ${licenseKey}`);
    return false;
  }

  if (!license.isActive) {
    console.warn(`[License] Lisans deaktif: ${licenseKey}`);
    return false;
  }

  if (new Date() > license.expiresAt) {
    console.warn(`[License] Lisans süresi doldu: ${licenseKey}`);
    return false;
  }

  return true;
}

/**
 * Check if license is expired
 */
export async function isLicenseExpired(licenseKey: string): Promise<boolean> {
  const license = licenses.get(licenseKey);

  if (!license) {
    return true;
  }

  return new Date() > license.expiresAt;
}

/**
 * Get license features
 */
export async function getLicenseFeatures(packageType: string) {
  const features = PACKAGE_FEATURES[packageType];

  if (!features) {
    return null;
  }

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
 * Update license features for a package
 */
export async function updateLicenseFeatures(
  packageType: string,
  features: Record<string, boolean>
): Promise<{ success: boolean; message: string }> {
  try {
    if (!PACKAGE_FEATURES[packageType]) {
      return {
        success: false,
        message: "Geçersiz paket türü",
      };
    }

    // Update package features
    PACKAGE_FEATURES[packageType] = {
      ...PACKAGE_FEATURES[packageType],
      ...features,
    };

    // Update all existing licenses with this package type
    licenses.forEach((license) => {
      if (license.packageType === packageType) {
        license.features = {
          telegram: features.telegram || false,
          autoMode: features.autoMode || false,
          analytics: features.analytics || false,
          customTeams: features.customTeams || false,
          multiSession: features.multiSession || false,
          apiAccess: features.apiAccess || false,
        };
      }
    });

    console.log(`[License] Paket özellikleri güncellendi: ${packageType}`);

    return {
      success: true,
      message: "Özellikler başarıyla güncellendi",
    };
  } catch (error) {
    console.error("[License] Özellik güncelleme hatası:", error);
    return {
      success: false,
      message: "Özellik güncelleme başarısız",
    };
  }
}

/**
 * Get license usage info
 */
export async function getLicenseUsage(licenseKey: string) {
  const license = licenses.get(licenseKey);

  if (!license) {
    return null;
  }

  return {
    licenseKey,
    packageType: license.packageType,
    broadcasterName: license.broadcasterName,
    maxSessions: license.maxSessions,
    maxPlayers: license.maxPlayers,
    expiresAt: license.expiresAt,
    daysRemaining: Math.ceil(
      (license.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    ),
    isExpired: new Date() > license.expiresAt,
  };
}

/**
 * Deactivate license
 */
export async function deactivateLicense(licenseKey: string): Promise<boolean> {
  const license = licenses.get(licenseKey);

  if (!license) {
    return false;
  }

  license.isActive = false;
  console.log(`[License] Lisans deaktif edildi: ${licenseKey}`);
  return true;
}

/**
 * Reactivate license
 */
export async function reactivateLicense(licenseKey: string): Promise<boolean> {
  const license = licenses.get(licenseKey);

  if (!license) {
    return false;
  }

  license.isActive = true;
  console.log(`[License] Lisans aktif edildi: ${licenseKey}`);
  return true;
}
