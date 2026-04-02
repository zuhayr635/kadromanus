# Admin JWT Authentication — Design Spec

## Overview

Protect the admin panel (dashboard + license panel) and all admin tRPC routes with a simple password-based JWT authentication system. An admin enters `ADMIN_PASSWORD` on a login page, receives a 30-day httpOnly JWT cookie (`admin_token`), and is redirected to the dashboard. All admin tRPC endpoints reject requests without a valid `admin_token`.

This is independent of the existing OAuth system — no user account or role is involved. An admin session can exist without any OAuth user being logged in.

## Architecture

### New file: `server/admin-auth.ts`

Two exported functions + three Express route handlers:

**JWT library:** Use `jose` (already installed as a project dependency — v6.x). Do not add `jsonwebtoken`.

**`signAdminToken(): Promise<string>`**
Signs a JWT with `{ role: 'admin' }` payload using `ADMIN_JWT_SECRET` (encoded as `new TextEncoder().encode(secret)` for HMAC-SHA256). Expiry: 30 days. Algorithm: HS256. Uses `jose`'s `new SignJWT().setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(key)`.

**`verifyAdminToken(token: string): Promise<boolean>`**
Verifies the JWT signature and expiry using `jose`'s `jwtVerify`. Returns `true` if valid, `false` otherwise — wraps in try/catch, never throws.

**Startup guard:** At module load time (top-level code, outside any function), check `process.env.ADMIN_JWT_SECRET`. If missing or empty, immediately throw `new Error("ADMIN_JWT_SECRET environment variable is required")`. This crashes the process before any routes are registered.

**Cookie parsing:** Read `req.headers.cookie` and parse it with the `cookie` npm package (already installed — used in `server/_core/sdk.ts`). Do NOT add `cookie-parser`. The `cookie` package's `parse()` function does not throw on malformed input; treat any parse error as "no token" by wrapping in try/catch:
```typescript
import { parse as parseCookies } from "cookie";
function getAdminToken(req: Request): string {
  try {
    return parseCookies(req.headers.cookie ?? "")["admin_token"] ?? "";
  } catch {
    return "";
  }
}
```

**Route handlers** (registered by `registerAdminAuthRoutes(app)`):
- `POST /api/admin/login` — reads `req.body.password`, performs timing-safe comparison against `ADMIN_PASSWORD`. On match: signs token, sets `admin_token` cookie, responds `200 { ok: true }`. On mismatch or missing `ADMIN_PASSWORD`: `401 { error: 'unauthorized' }`.
- `POST /api/admin/logout` — clears `admin_token` cookie, responds `200 { ok: true }`.
- `GET /api/admin/me` — reads `admin_token` cookie, verifies it. On valid token: responds `200 { ok: true }`. On missing or invalid token: responds `401 { ok: false }`.

**Timing-safe password comparison:** To avoid timing attacks regardless of input length, hash both the expected and provided passwords with SHA-256, then compare digests with `crypto.timingSafeEqual`. If `ADMIN_PASSWORD` is not set, immediately return 401 (do not hash an empty string — fail explicitly):
```typescript
import { createHash, timingSafeEqual } from "crypto";
function checkPassword(provided: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false; // explicitly locked out if not set
  const expected = createHash("sha256").update(adminPassword).digest();
  const input = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expected, input);
}
```

### Modifications

**`server/_core/context.ts`**
Add `isAdmin: boolean` to `TrpcContext`. This is an independent field — it does not replace `user: User | null`. An admin session can exist with or without an OAuth user. In `createContext`, call `getAdminToken(req)` (or inline the same logic), call `await verifyAdminToken(token)`, set `isAdmin` accordingly. Since `verifyAdminToken` is async, `createContext` must be async.

Example addition:
```typescript
const adminToken = getAdminToken(req); // or inline cookie parse
const isAdmin = adminToken ? await verifyAdminToken(adminToken) : false;
return { req, res, user, isAdmin };
```

**`server/_core/trpc.ts`**
Replace `adminProcedure`'s middleware entirely: the current check (`ctx.user.role === 'admin'`) is replaced with `ctx.isAdmin`. This is a complete replacement of the condition:
```typescript
const adminProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return opts.next();
});
```

**`server/routers/admin.ts`**
Replace all `publicProcedure` with `adminProcedure`. Import `adminProcedure` from `../_core/trpc`. (There are 8 procedures — replace all.)

**`server/_core/index.ts`**
Call `registerAdminAuthRoutes(app)` after `express.json()` body parsing middleware but before tRPC middleware registration. Placement: look for where `app.use('/api/trpc', ...)` is registered and insert `registerAdminAuthRoutes(app)` immediately before it.

**`client/public/admin-login.html`** (new)
Self-contained HTML login page. On submit: `POST /api/admin/login`. On success (response.ok): `location.href = '/admin-dashboard.html'`. On failure: show inline error. Dark green theme matching the project.

**`client/public/admin-dashboard.html`** + **`client/public/license-panel.html`**
Add an auth guard at the top of the `<script>` block:
```js
(async () => {
  const r = await fetch('/api/admin/me');
  if (!r.ok) location.href = '/admin-login.html';
})();
```
Add a logout button that calls `POST /api/admin/logout` then redirects to `/admin-login.html`.

## Cookie Configuration

| Property | Value |
|---|---|
| Name | `admin_token` |
| httpOnly | true |
| secure | true |
| sameSite | strict |
| maxAge | 2592000000 ms (30 days) |
| path | / |

Set via `res.cookie('admin_token', token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 2592000000, path: '/' })`.
Clear via `res.cookie('admin_token', '', { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 0, path: '/' })`.

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `ADMIN_PASSWORD` | Yes | Plain-text admin password | `changeme-in-production` |
| `ADMIN_JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) | `a-long-random-secret-at-least-32-chars!!` |

Missing `ADMIN_JWT_SECRET` crashes the server at startup. Missing `ADMIN_PASSWORD` results in all login attempts returning 401 (admin is locked out — log a warning at startup).

## Security

- Password comparison uses SHA-256 hashing + `crypto.timingSafeEqual` to prevent timing attacks on passwords of any length
- Missing `ADMIN_PASSWORD` → all logins return 401 (no hash of empty string)
- `admin_token` is httpOnly (no JS access) and sameSite=strict
- `verifyAdminToken` catches all errors and returns `false` — never leaks JWT internals
- Missing `ADMIN_JWT_SECRET` crashes the server at startup (fail-fast, top-level module check)
- `isAdmin` in tRPC context is completely independent of OAuth user role

## Testing

**Unit tests** (`server/admin-auth.test.ts`):
- `signAdminToken` returns a string (valid JWT format)
- `verifyAdminToken` returns true for a freshly signed token
- `verifyAdminToken` returns false for a token signed with a different secret
- `verifyAdminToken` returns false for an expired token (create a token with `setExpirationTime('1ms')`, wait 5ms, then verify)
- `checkPassword` returns false when `ADMIN_PASSWORD` env var is not set (test by temporarily unsetting it in the test)

Note: The startup guard (top-level throw) cannot be easily unit tested through module re-require since Node caches modules. Test it manually: start the server without `ADMIN_JWT_SECRET` and confirm it crashes with the expected message.

**Integration tests** (manual):
- POST /api/admin/login with wrong password → 401
- POST /api/admin/login with correct password → 200, `admin_token` cookie set
- GET /api/admin/me with valid cookie → 200 `{ ok: true }`
- GET /api/admin/me without cookie → 401 `{ ok: false }`
- POST /api/admin/logout → 200 `{ ok: true }`, cookie cleared
- GET /api/admin/me after logout → 401
- GET /api/trpc/admin.getAllSessions without cookie → FORBIDDEN
- GET /api/trpc/admin.getAllSessions with valid cookie → 200

## File Changes Summary

| File | Change |
|---|---|
| `server/admin-auth.ts` | New — JWT helpers + Express route handlers |
| `server/admin-auth.test.ts` | New — unit tests for sign/verify/checkPassword |
| `server/_core/context.ts` | Add `isAdmin: boolean` (independent of `user`) |
| `server/_core/trpc.ts` | `adminProcedure` replaced to check `ctx.isAdmin` |
| `server/routers/admin.ts` | All `publicProcedure` → `adminProcedure` (8 procedures) |
| `server/_core/index.ts` | Register admin auth routes before tRPC middleware |
| `client/public/admin-login.html` | New — login page |
| `client/public/admin-dashboard.html` | Add auth guard + logout button |
| `client/public/license-panel.html` | Add auth guard + logout button |
| `.env.example` | Add ADMIN_PASSWORD, ADMIN_JWT_SECRET |
