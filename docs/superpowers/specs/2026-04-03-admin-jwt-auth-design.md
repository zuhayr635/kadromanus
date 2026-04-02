# Admin JWT Authentication — Design Spec

## Overview

Protect the admin panel (dashboard + license panel) and all admin tRPC routes with a simple password-based JWT authentication system. An admin enters `ADMIN_PASSWORD` on a login page, receives a 30-day httpOnly JWT cookie (`admin_token`), and is redirected to the dashboard. All admin tRPC endpoints reject requests without a valid `admin_token`.

This is independent of the existing OAuth system — no user account or role is involved.

## Architecture

### New file: `server/admin-auth.ts`

Two exported functions + three Express route handlers:

**`signAdminToken(): string`**
Signs a JWT with `{ role: 'admin' }` using `ADMIN_JWT_SECRET`. Expiry: 30 days. Algorithm: HS256.

**`verifyAdminToken(token: string): boolean`**
Verifies the JWT signature and expiry. Returns `true` if valid, `false` otherwise (never throws).

**Route handlers** (registered by `registerAdminAuthRoutes(app)`):
- `POST /api/admin/login` — reads `req.body.password`, compares to `ADMIN_PASSWORD` with `timingSafeEqual`. On match: signs token, sets `admin_token` cookie, responds `{ ok: true }`. On mismatch: 401 `{ error: 'unauthorized' }`.
- `POST /api/admin/logout` — clears `admin_token` cookie, responds `{ ok: true }`.
- `GET /api/admin/me` — reads `admin_token` cookie, verifies it. Responds `{ ok: true }` or 401.

**Startup guard:** If `ADMIN_JWT_SECRET` is missing or empty at module load, throw an `Error` to crash the process with a clear message.

### Modifications

**`server/_core/context.ts`**
Add `isAdmin: boolean` to `TrpcContext`. In `createContext`, read `req.cookies['admin_token']`, call `verifyAdminToken`, set `isAdmin` accordingly.

Requires adding `cookie-parser` middleware (or reading `req.cookies` directly if already parsed).

**`server/_core/trpc.ts`**
Replace `adminProcedure`'s middleware: check `ctx.isAdmin` instead of `ctx.user.role`. Throw `FORBIDDEN` if false.

**`server/routers/admin.ts`**
Replace all `publicProcedure` with `adminProcedure`. Import `adminProcedure` from `../_core/trpc`.

**`server/_core/index.ts`**
Call `registerAdminAuthRoutes(app)` before tRPC middleware.

**`client/public/admin-login.html`** (new)
Self-contained HTML login page. On submit: `POST /api/admin/login`. On success: redirect to `/admin-dashboard.html`. On failure: show inline error. Dark green theme matching the project.

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
| maxAge | 30 days (ms) |
| path | / |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ADMIN_PASSWORD` | Yes | Plain-text admin password |
| `ADMIN_JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars recommended) |

## Security

- Password comparison uses `crypto.timingSafeEqual` to prevent timing attacks
- `admin_token` is httpOnly (no JS access) and sameSite=strict
- `verifyAdminToken` catches all errors and returns `false` — never leaks JWT internals
- Missing `ADMIN_JWT_SECRET` crashes the server at startup (fail-fast)

## Testing

**Unit tests** (`server/admin-auth.test.ts`):
- `signAdminToken` returns a valid JWT string
- `verifyAdminToken` returns true for a freshly signed token
- `verifyAdminToken` returns false for a tampered token
- `verifyAdminToken` returns false for an expired token

**Integration tests** (optional, manual):
- POST /api/admin/login with wrong password → 401
- POST /api/admin/login with correct password → 200, cookie set
- GET /api/trpc/admin.getAllSessions without cookie → FORBIDDEN
- GET /api/trpc/admin.getAllSessions with valid cookie → 200

## File Changes Summary

| File | Change |
|---|---|
| `server/admin-auth.ts` | New — JWT helpers + Express route handlers |
| `server/admin-auth.test.ts` | New — unit tests for sign/verify |
| `server/_core/context.ts` | Add `isAdmin: boolean` to context |
| `server/_core/trpc.ts` | `adminProcedure` checks `ctx.isAdmin` |
| `server/routers/admin.ts` | All `publicProcedure` → `adminProcedure` |
| `server/_core/index.ts` | Register admin auth routes |
| `client/public/admin-login.html` | New — login page |
| `client/public/admin-dashboard.html` | Add auth guard + logout button |
| `client/public/license-panel.html` | Add auth guard + logout button |
| `.env.example` | Add ADMIN_PASSWORD, ADMIN_JWT_SECRET |
