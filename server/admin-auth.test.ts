// server/admin-auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Set env before importing the module
const originalSecret = process.env.ADMIN_JWT_SECRET;
const originalPassword = process.env.ADMIN_PASSWORD;

beforeAll(() => {
  process.env.ADMIN_JWT_SECRET = "test-secret-that-is-at-least-32-characters-long!!";
  process.env.ADMIN_PASSWORD = "test-password-123";
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.ADMIN_JWT_SECRET;
  else process.env.ADMIN_JWT_SECRET = originalSecret;
  if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = originalPassword;
});

// Dynamic import AFTER env is set
const getModule = () => import("./admin-auth");

describe("signAdminToken", () => {
  it("returns a JWT string", async () => {
    const { signAdminToken } = await getModule();
    const token = await signAdminToken();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature
  });
});

describe("verifyAdminToken", () => {
  it("returns true for a freshly signed token", async () => {
    const { signAdminToken, verifyAdminToken } = await getModule();
    const token = await signAdminToken();
    expect(await verifyAdminToken(token)).toBe(true);
  });

  it("returns false for a token signed with a different secret", async () => {
    const { verifyAdminToken } = await getModule();
    // Manually craft a token signed with wrong secret
    const { SignJWT } = await import("jose");
    const badKey = new TextEncoder().encode("completely-different-secret-that-is-32-chars!");
    const badToken = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(badKey);
    expect(await verifyAdminToken(badToken)).toBe(false);
  });

  it("returns false for an expired token", async () => {
    const { verifyAdminToken } = await getModule();
    const { SignJWT } = await import("jose");
    const key = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
    const expiredToken = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(new Date(Date.now() - 1000)) // expired 1 second ago
      .sign(key);
    expect(await verifyAdminToken(expiredToken)).toBe(false);
  });

  it("returns false for garbage input", async () => {
    const { verifyAdminToken } = await getModule();
    expect(await verifyAdminToken("not.a.jwt")).toBe(false);
    expect(await verifyAdminToken("")).toBe(false);
  });
});

describe("checkPassword", () => {
  it("returns true for correct password", async () => {
    const { checkPassword } = await getModule();
    expect(checkPassword("test-password-123")).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const { checkPassword } = await getModule();
    expect(checkPassword("wrong-password")).toBe(false);
  });

  it("returns false when ADMIN_PASSWORD is not set", async () => {
    const { checkPassword } = await getModule();
    const saved = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    expect(checkPassword("anything")).toBe(false);
    process.env.ADMIN_PASSWORD = saved;
  });
});
