// server/admin-auth.ts
import { SignJWT, jwtVerify } from "jose";
import { createHash, timingSafeEqual } from "crypto";
import { parse as parseCookies } from "cookie";
import type { Request, Response, Express } from "express";

// --- Startup guard ---
// Crash the process at module load if ADMIN_JWT_SECRET is missing.
if (!process.env.ADMIN_JWT_SECRET) {
  throw new Error(
    "ADMIN_JWT_SECRET environment variable is required. Set it to a random string of at least 32 characters."
  );
}

const getSecret = () =>
  new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);

// --- JWT helpers ---

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch (_e) {
    return false;
  }
}

// --- Password check ---

export function checkPassword(provided: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expected = createHash("sha256").update(adminPassword).digest();
  const input = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expected, input);
}

// --- Cookie helper ---

export function getAdminTokenFromRequest(req: Request): string {
  try {
    return parseCookies(req.headers.cookie ?? "")["admin_token"] ?? "";
  } catch {
    return "";
  }
}

// --- Express route handlers ---

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
};

export function registerAdminAuthRoutes(app: Express): void {
  // POST /api/admin/login
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    const { password } = req.body as { password?: string };
    if (!password || !checkPassword(password)) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const token = await signAdminToken();
    res.cookie("admin_token", token, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    });
    res.json({ ok: true });
  });

  // POST /api/admin/logout
  app.post("/api/admin/logout", (_req: Request, res: Response) => {
    res.cookie("admin_token", "", { ...COOKIE_OPTIONS, maxAge: 0 });
    res.json({ ok: true });
  });

  // GET /api/admin/me
  app.get("/api/admin/me", async (req: Request, res: Response) => {
    const token = getAdminTokenFromRequest(req);
    if (token && (await verifyAdminToken(token))) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ ok: false });
    }
  });
}
