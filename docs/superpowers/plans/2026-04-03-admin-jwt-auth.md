# Admin JWT Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect all admin tRPC routes and HTML panels behind a password-based JWT cookie so the admin panel can't be accessed without authentication.

**Architecture:** A new `server/admin-auth.ts` module provides JWT sign/verify helpers and three Express route handlers (login/logout/me). The tRPC context gains an `isAdmin: boolean` field (read from the `admin_token` cookie), and `adminProcedure` is rewired to check `ctx.isAdmin` instead of `ctx.user.role`. HTML panels get an auth guard script at the top of their `<script>` block plus a logout button.

**Tech Stack:** `jose` v6 (JWT, already installed), `cookie` npm package (cookie parsing, already installed), `crypto` built-in (timingSafeEqual + SHA-256), Express, TypeScript, Vitest

---

## Files

| File | Action |
|---|---|
| `server/admin-auth.ts` | Create — JWT helpers + route handlers |
| `server/admin-auth.test.ts` | Create — unit tests |
| `server/_core/context.ts` | Modify — add `isAdmin: boolean` |
| `server/_core/trpc.ts` | Modify — replace `adminProcedure` middleware |
| `server/routers/admin.ts` | Modify — `publicProcedure` → `adminProcedure` |
| `server/_core/index.ts` | Modify — register admin auth routes |
| `client/public/admin-login.html` | Create — login page |
| `client/public/admin-dashboard.html` | Modify — add auth guard + logout button |
| `client/public/license-panel.html` | Modify — add auth guard + logout button |
| `.env.example` | Modify — add ADMIN_PASSWORD, ADMIN_JWT_SECRET |

---

### Task 1: Create server/admin-auth.ts with unit tests (TDD)

**Files:**
- Create: `server/admin-auth.test.ts`
- Create: `server/admin-auth.ts`

#### Step 1: Create the test file first

- [ ] **Step 1: Create `server/admin-auth.test.ts`**

```typescript
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
```

- [ ] **Step 2: Run tests to confirm they fail (module not found)**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm test server/admin-auth.test.ts
```

Expected: FAIL with `Cannot find module './admin-auth'`

- [ ] **Step 3: Create `server/admin-auth.ts`**

```typescript
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
  } catch {
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
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm test server/admin-auth.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/admin-auth.ts server/admin-auth.test.ts
git commit -m "feat: add admin-auth JWT helpers, password check, and Express routes"
```

---

### Task 2: Add isAdmin to tRPC context

**Files:**
- Modify: `server/_core/context.ts`

Current file:
```typescript
export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return { req: opts.req, res: opts.res, user };
}
```

- [ ] **Step 1: Modify `server/_core/context.ts`**

Replace the entire file with:

```typescript
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyAdminToken, getAdminTokenFromRequest } from "../admin-auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  isAdmin: boolean;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  const adminToken = getAdminTokenFromRequest(opts.req);
  const isAdmin = adminToken ? await verifyAdminToken(adminToken) : false;

  return {
    req: opts.req,
    res: opts.res,
    user,
    isAdmin,
  };
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/_core/context.ts
git commit -m "feat: add isAdmin boolean to tRPC context"
```

---

### Task 3: Replace adminProcedure to check ctx.isAdmin

**Files:**
- Modify: `server/_core/trpc.ts`

Current `adminProcedure` (lines 30–45):
```typescript
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
```

- [ ] **Step 1: Replace `adminProcedure` in `server/_core/trpc.ts`**

Replace lines 30–45 with:

```typescript
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.isAdmin) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx });
  }),
);
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/_core/trpc.ts
git commit -m "feat: adminProcedure now checks ctx.isAdmin instead of user role"
```

---

### Task 4: Switch admin router from publicProcedure to adminProcedure

**Files:**
- Modify: `server/routers/admin.ts`

There are 8 procedures all using `publicProcedure`. Replace the import and all occurrences.

- [ ] **Step 1: Edit `server/routers/admin.ts`**

Change line 1 from:
```typescript
import { publicProcedure, router } from "../_core/trpc";
```
to:
```typescript
import { adminProcedure, router } from "../_core/trpc";
```

Then replace every occurrence of `publicProcedure` with `adminProcedure` (8 occurrences: `getSessionHistory`, `getAllSessions`, `getSessionsByLicense`, `getSessionsByBroadcaster`, `getStatistics`, `getTopBroadcasters`, `exportData`, `clearOldHistory`).

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Run full test suite to confirm nothing broken**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm test
```

Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/routers/admin.ts
git commit -m "feat: protect all admin tRPC procedures with adminProcedure"
```

---

### Task 5: Register admin auth routes in Express app

**Files:**
- Modify: `server/_core/index.ts`

The file currently registers routes in this order (lines 36–47):
1. `express.json()` — line 36
2. `express.urlencoded()` — line 37
3. `registerOAuthRoutes(app)` — line 39
4. tRPC middleware at `/api/trpc` — line 41

We need to add `registerAdminAuthRoutes(app)` after OAuth but before tRPC.

- [ ] **Step 1: Edit `server/_core/index.ts`**

Add import after the existing imports:
```typescript
import { registerAdminAuthRoutes } from "../admin-auth";
```

Insert the call between `registerOAuthRoutes(app)` and the tRPC middleware:
```typescript
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Admin JWT auth routes: /api/admin/login, /api/admin/logout, /api/admin/me
  registerAdminAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    ...
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd "C:/Users/Luana/Downloads/MultiCihanekspress/kadromanus"
pnpm exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add server/_core/index.ts
git commit -m "feat: register admin auth routes in Express app"
```

---

### Task 6: Create admin-login.html

**Files:**
- Create: `client/public/admin-login.html`

- [ ] **Step 1: Create `client/public/admin-login.html`**

```html
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kadrokur — Admin Girişi</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family:'Segoe UI',system-ui,sans-serif;
    background:#030a06;
    color:#e2e8f0;
    min-height:100vh;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .card {
    background:#0a1a0f;
    border:1px solid #14532d;
    border-radius:12px;
    padding:2rem;
    width:100%;
    max-width:360px;
  }
  .logo { text-align:center; margin-bottom:1.75rem; }
  .logo-title { font-size:1.2rem; font-weight:800; letter-spacing:0.1em; color:#22c55e; }
  .logo-sub { font-size:0.65rem; color:#166534; letter-spacing:0.1em; margin-top:3px; }
  label { display:block; font-size:0.7rem; font-weight:700; letter-spacing:0.08em; color:#4ade80; text-transform:uppercase; margin-bottom:0.4rem; }
  input[type="password"] {
    width:100%;
    background:#030a06;
    border:1px solid #14532d;
    border-radius:6px;
    color:#e2e8f0;
    padding:0.6rem 0.75rem;
    font-size:0.9rem;
    outline:none;
    margin-bottom:1.25rem;
  }
  input[type="password"]:focus { border-color:#22c55e44; }
  button[type="submit"] {
    width:100%;
    background:linear-gradient(135deg,#16a34a,#15803d);
    border:none;
    border-radius:7px;
    color:#fff;
    font-size:0.85rem;
    font-weight:700;
    letter-spacing:0.05em;
    padding:0.65rem;
    cursor:pointer;
  }
  button[type="submit"]:hover { opacity:0.9; }
  .error {
    display:none;
    margin-top:0.75rem;
    padding:0.5rem 0.75rem;
    background:#7f1d1d22;
    border:1px solid #7f1d1d;
    border-radius:6px;
    color:#fca5a5;
    font-size:0.78rem;
  }
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <div class="logo-title">KADROKUR</div>
    <div class="logo-sub">ADMIN PANELİ</div>
  </div>
  <form id="loginForm">
    <label for="password">Şifre</label>
    <input type="password" id="password" name="password" autocomplete="current-password" required>
    <button type="submit">Giriş Yap</button>
    <div class="error" id="errorMsg">Hatalı şifre. Lütfen tekrar deneyin.</div>
  </form>
</div>
<script>
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.style.display = 'none';

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        location.href = '/admin-dashboard.html';
      } else {
        errorMsg.style.display = 'block';
      }
    } catch {
      errorMsg.textContent = 'Bağlantı hatası. Lütfen tekrar deneyin.';
      errorMsg.style.display = 'block';
    }
  });
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add client/public/admin-login.html
git commit -m "feat: add admin-login.html with dark green theme"
```

---

### Task 7: Add auth guard and logout to admin-dashboard.html

**Files:**
- Modify: `client/public/admin-dashboard.html`

The `<script>` block begins at line 527. We need to:
1. Insert auth guard at the very top of the script block (before any other JS)
2. Add a logout button in the header area

- [ ] **Step 1: Add auth guard at the top of the script block**

Find the opening `<script>` tag (line 527) in `client/public/admin-dashboard.html` and insert immediately after it:

```js
  // Auth guard — redirect to login if not authenticated
  (async () => {
    const r = await fetch('/api/admin/me');
    if (!r.ok) { location.href = '/admin-login.html'; }
  })();
```

So the top of the script block becomes:
```html
  <script>
    // Auth guard — redirect to login if not authenticated
    (async () => {
      const r = await fetch('/api/admin/me');
      if (!r.ok) { location.href = '/admin-login.html'; }
    })();

    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
```

- [ ] **Step 2: Add a logout button**

Find the `.header` div (around line 28) in `admin-dashboard.html`. It has a title and subtitle. Add a logout button inside the header. Locate the closing `</div>` of the header section and insert the button and its inline style before it closes. The exact placement depends on the existing HTML structure — add the button as a flex sibling to the title area:

After finding the header's closing tag, add this button and its style:

In the `<style>` block (before `</style>`), add:
```css
    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.85rem;
      background: #0a1a0f;
      border: 1px solid #991b1b;
      border-radius: 6px;
      color: #fca5a5;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .logout-btn:hover { border-color: #ef4444; }
```

At the bottom of the `<script>` block (before `</script>`), add:
```js
    // Logout button handler
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await fetch('/api/admin/logout', { method: 'POST' });
      location.href = '/admin-login.html';
    });
```

In the HTML, inside the `.header` div (find the div that has the title "Kadrokur Admin" or similar heading), add the button before the header's closing `</div>`:
```html
<button class="logout-btn" id="logoutBtn">Çıkış Yap</button>
```

- [ ] **Step 3: Commit**

```bash
git add client/public/admin-dashboard.html
git commit -m "feat: add auth guard and logout button to admin-dashboard.html"
```

---

### Task 8: Add auth guard and logout to license-panel.html

**Files:**
- Modify: `client/public/license-panel.html`

The `<script>` block begins at line 192. The page already has a `.header` div with a `.back-btn` (line 18).

- [ ] **Step 1: Add auth guard at the top of the script block**

Find `<script>` at line 192 and insert immediately after it:

```js
  // Auth guard — redirect to login if not authenticated
  (async () => {
    const r = await fetch('/api/admin/me');
    if (!r.ok) { location.href = '/admin-login.html'; }
  })();
```

- [ ] **Step 2: Add logout button to the header**

The header (line 13) currently contains `.header-left` (logo area) and `.back-btn` (a link). Add a logout button alongside the back button.

In the `<style>` block, add:
```css
  .logout-btn { display:flex; align-items:center; gap:0.4rem; padding:0.4rem 0.85rem; background:#0a1a0f; border:1px solid #991b1b; border-radius:6px; color:#fca5a5; font-size:0.75rem; font-weight:600; cursor:pointer; }
  .logout-btn:hover { border-color:#ef4444; }
```

In the `.header` div (line 13), after the existing `.back-btn`, add:
```html
<button class="logout-btn" id="logoutBtn">Çıkış Yap</button>
```

At the bottom of the `<script>` block, add:
```js
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    location.href = '/admin-login.html';
  });
```

- [ ] **Step 3: Commit**

```bash
git add client/public/license-panel.html
git commit -m "feat: add auth guard and logout button to license-panel.html"
```

---

### Task 9: Update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add admin env vars to `.env.example`**

Current content ends with:
```
# Puppeteer — leave empty to use bundled Chromium; set for Docker/Alpine
# PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

Append:
```
# Admin Panel Authentication
ADMIN_PASSWORD=changeme-in-production
ADMIN_JWT_SECRET=a-long-random-secret-at-least-32-characters-long!!
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add ADMIN_PASSWORD and ADMIN_JWT_SECRET to .env.example"
```

---

### Task 10: Manual verification checklist

No automated test for the full login flow. Verify manually:

- [ ] Set `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET` in `.env`
- [ ] Start dev server: `pnpm dev`
- [ ] Open `http://localhost:3000/admin-login.html` — login page should show
- [ ] Try wrong password → error message shown
- [ ] Try correct password → redirected to `/admin-dashboard.html`
- [ ] Open `/license-panel.html` directly — should render (cookie present)
- [ ] Delete the `admin_token` cookie manually in browser DevTools → reload → redirected to login
- [ ] Click "Çıkış Yap" → redirected to login page
- [ ] Verify `GET /api/trpc/admin.getAllSessions` without cookie → FORBIDDEN error
- [ ] Verify `GET /api/trpc/admin.getAllSessions` with valid cookie → returns data
- [ ] Start server WITHOUT `ADMIN_JWT_SECRET` set → confirm server crashes with clear error message
