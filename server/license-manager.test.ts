import { describe, it, expect, vi } from "vitest";

// Mock database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

import * as licenseManager from "./license-manager";

describe("License Manager", () => {
  it("should return failure when database is unavailable - createLicense", async () => {
    const result = await licenseManager.createLicense(
      "basic",
      "Test Broadcaster",
      "test@example.com",
      30,
      1,
      500
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("baglantisi");
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
  });

  it("should return false for validate when database unavailable", async () => {
    const isValid = await licenseManager.validateLicense("INVALID-KEY");
    expect(isValid).toBe(false);
  });

  it("should return null for getLicenseByKey when database unavailable", async () => {
    const license = await licenseManager.getLicenseByKey("INVALID-KEY");
    expect(license).toBeNull();
  });

  it("should return empty array for getAllLicenses when database unavailable", async () => {
    const licenses = await licenseManager.getAllLicenses();
    expect(Array.isArray(licenses)).toBe(true);
    expect(licenses.length).toBe(0);
  });

  it("should return false for isLicenseExpired when database unavailable", async () => {
    const isExpired = await licenseManager.isLicenseExpired("INVALID-KEY");
    expect(isExpired).toBe(true); // Defaults to expired when DB unavailable
  });

  it("should return false for deactivateLicense when database unavailable", async () => {
    const result = await licenseManager.deactivateLicense("INVALID-KEY");
    expect(result).toBe(false);
  });

  it("should return false for reactivateLicense when database unavailable", async () => {
    const result = await licenseManager.reactivateLicense("INVALID-KEY");
    expect(result).toBe(false);
  });

  it("should return null for getLicenseUsage when database unavailable", async () => {
    const usage = await licenseManager.getLicenseUsage("INVALID-KEY");
    expect(usage).toBeNull();
  });

  it("should return feature info for all packages", async () => {
    const basicFeatures = await licenseManager.getLicenseFeatures("basic");
    const proFeatures = await licenseManager.getLicenseFeatures("pro");
    const premiumFeatures = await licenseManager.getLicenseFeatures("premium");
    const unlimitedFeatures = await licenseManager.getLicenseFeatures("unlimited");

    expect(basicFeatures).not.toBeNull();
    expect(proFeatures).not.toBeNull();
    expect(premiumFeatures).not.toBeNull();
    expect(unlimitedFeatures).not.toBeNull();

    expect(basicFeatures?.name).toBe("Basic");
    expect(proFeatures?.name).toBe("Pro");
    expect(premiumFeatures?.name).toBe("Premium");
    expect(unlimitedFeatures?.name).toBe("Unlimited");
  });
});
