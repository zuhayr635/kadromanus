import { describe, it, expect, beforeEach } from "vitest";
import * as licenseManager from "./license-manager";

describe("License Manager", () => {
  beforeEach(async () => {
    // Clear licenses before each test
    const allLicenses = await licenseManager.getAllLicenses();
    for (const license of allLicenses) {
      await licenseManager.deactivateLicense(license.key);
    }
  });

  it("should create a license with valid data", async () => {
    const result = await licenseManager.createLicense(
      "basic",
      "Test Broadcaster",
      "test@example.com",
      30,
      1,
      500
    );

    expect(result.success).toBe(true);
    expect(result.licenseKey).toBeTruthy();
    expect(result.licenseKey).toMatch(/^HIRA-/);
  });

  it("should reject invalid package type", async () => {
    const result = await licenseManager.createLicense(
      "invalid",
      "Test Broadcaster",
      "test@example.com",
      30,
      1,
      500
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Geçersiz");
  });

  it("should validate license correctly", async () => {
    const created = await licenseManager.createLicense(
      "pro",
      "Test Broadcaster",
      "test@example.com",
      30,
      1,
      500
    );

    const isValid = await licenseManager.validateLicense(created.licenseKey!);
    expect(isValid).toBe(true);
  });

  it("should reject non-existent license", async () => {
    const isValid = await licenseManager.validateLicense("INVALID-KEY");
    expect(isValid).toBe(false);
  });

  it("should get license by key", async () => {
    const created = await licenseManager.createLicense(
      "premium",
      "Test Broadcaster",
      "test@example.com",
      30,
      2,
      1000
    );

    const license = await licenseManager.getLicenseByKey(created.licenseKey!);
    expect(license).not.toBeNull();
    expect(license?.packageType).toBe("premium");
    expect(license?.broadcasterName).toBe("Test Broadcaster");
  });

  it("should get all licenses", async () => {
    await licenseManager.createLicense("basic", "Broadcaster 1", "test1@example.com", 30, 1, 500);
    await licenseManager.createLicense("pro", "Broadcaster 2", "test2@example.com", 30, 1, 500);

    const licenses = await licenseManager.getAllLicenses();
    expect(licenses.length).toBeGreaterThanOrEqual(2);
  });

  it("should get license features by package type", async () => {
    const features = await licenseManager.getLicenseFeatures("pro");

    expect(features).not.toBeNull();
    expect(features?.packageType).toBe("pro");
    expect(features?.features.telegram).toBe(true);
    expect(features?.features.autoMode).toBe(true);
    expect(features?.features.analytics).toBe(false);
  });

  it("should update license features", async () => {
    const result = await licenseManager.updateLicenseFeatures("basic", {
      telegram: true,
      autoMode: true,
      analytics: false,
      customTeams: false,
      multiSession: false,
      apiAccess: false,
    });

    expect(result.success).toBe(true);

    const features = await licenseManager.getLicenseFeatures("basic");
    expect(features?.features.telegram).toBe(true);
    expect(features?.features.autoMode).toBe(true);
  });

  it("should check license expiration", async () => {
    const created = await licenseManager.createLicense(
      "basic",
      "Test Broadcaster",
      "test@example.com",
      30,
      1,
      500
    );

    const isExpired = await licenseManager.isLicenseExpired(created.licenseKey!);
    expect(isExpired).toBe(false);
  });

  it("should deactivate license", async () => {
    const created = await licenseManager.createLicense(
      "basic",
      "Test Broadcaster",
      "test@example.com",
      30,
      1,
      500
    );

    const deactivated = await licenseManager.deactivateLicense(created.licenseKey!);
    expect(deactivated).toBe(true);

    const isValid = await licenseManager.validateLicense(created.licenseKey!);
    expect(isValid).toBe(false);
  });

  it("should reactivate license", async () => {
    const created = await licenseManager.createLicense(
      "basic",
      "Test Broadcaster",
      "test@example.com",
      30,
      1,
      500
    );

    await licenseManager.deactivateLicense(created.licenseKey!);
    const reactivated = await licenseManager.reactivateLicense(created.licenseKey!);
    expect(reactivated).toBe(true);

    const isValid = await licenseManager.validateLicense(created.licenseKey!);
    expect(isValid).toBe(true);
  });

  it("should get license usage info", async () => {
    const created = await licenseManager.createLicense(
      "premium",
      "Test Broadcaster",
      "test@example.com",
      30,
      2,
      1000
    );

    const usage = await licenseManager.getLicenseUsage(created.licenseKey!);
    expect(usage).not.toBeNull();
    expect(usage?.packageType).toBe("premium");
    expect(usage?.maxSessions).toBe(2);
    expect(usage?.maxPlayers).toBe(1000);
    expect(usage?.daysRemaining).toBeGreaterThan(0);
  });

  it("should validate package features structure", async () => {
    const basicFeatures = await licenseManager.getLicenseFeatures("basic");
    const proFeatures = await licenseManager.getLicenseFeatures("pro");
    const premiumFeatures = await licenseManager.getLicenseFeatures("premium");
    const unlimitedFeatures = await licenseManager.getLicenseFeatures("unlimited");

    expect(basicFeatures?.features).toHaveProperty("telegram");
    expect(basicFeatures?.features).toHaveProperty("autoMode");
    expect(basicFeatures?.features).toHaveProperty("analytics");

    // Verify all packages have required properties
    expect(proFeatures?.features.telegram).toBe(true);
    expect(premiumFeatures?.features.analytics).toBe(true);
    expect(unlimitedFeatures?.features.apiAccess).toBe(true);

    // Verify package names
    expect(basicFeatures?.name).toBe("Basic");
    expect(proFeatures?.name).toBe("Pro");
    expect(premiumFeatures?.name).toBe("Premium");
    expect(unlimitedFeatures?.name).toBe("Unlimited");
  });
});
