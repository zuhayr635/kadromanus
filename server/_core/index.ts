import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import fs from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAdminAuthRoutes } from "../admin-auth";
import { appRouter } from "../routers";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeSocketServer } from "../socket-server";
import { registerPlayerRoutes } from "../player-api";
import * as licenseManager from "../license-manager";
import { verifyAdminToken, getAdminTokenFromRequest } from "../admin-auth";
import { initializeTelegramBot } from "../telegram-bot";
import { licenses as licensesTable, gameHistory, sessions, licenseLogs, appSettings, webhooks, notificationLog } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq, desc, and, sql, like, or } from "drizzle-orm";
import { getAllGifts, updateGiftQuality } from "../gift-manager";

// Middleware to require admin auth on REST endpoints
async function requireAdmin(req: any, res: any, next: any) {
  const token = getAdminTokenFromRequest(req);
  if (!token || !(await verifyAdminToken(token))) {
    return res.status(401).json({ error: "Unauthorized — admin token required" });
  }
  next();
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Create tables if not exists using raw SQL
  try {
    console.log("[Server] Initializing database tables...");
    const mysql = await import("mysql2/promise");
    const url = new URL(process.env.DATABASE_URL!);
    const conn = await mysql.default.createConnection({
      host: url.hostname,
      port: parseInt(url.port || "3306"),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      multipleStatements: true,
    });

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`openId\` varchar(64) NOT NULL,
        \`name\` text,
        \`email\` varchar(320),
        \`loginMethod\` varchar(64),
        \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`users_openId_unique\` (\`openId\`)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`licenses\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`licenseKey\` varchar(64) NOT NULL,
        \`ownerName\` text NOT NULL,
        \`ownerEmail\` varchar(320),
        \`ownerTikTok\` varchar(64),
        \`planType\` enum('basic','pro','premium','unlimited') NOT NULL DEFAULT 'basic',
        \`status\` enum('active','suspended','expired','revoked') NOT NULL DEFAULT 'active',
        \`maxSessions\` int NOT NULL DEFAULT 1,
        \`allowedFeatures\` json,
        \`totalUsageCount\` int DEFAULT 0,
        \`lastUsedAt\` timestamp NULL,
        \`lastUsedIp\` varchar(45),
        \`activatedAt\` timestamp NULL,
        \`expiresAt\` timestamp NULL,
        \`notes\` text,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`licenses_licenseKey_unique\` (\`licenseKey\`)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`licenseLogs\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`licenseId\` int NOT NULL,
        \`action\` varchar(64) NOT NULL,
        \`details\` text,
        \`ipAddress\` varchar(45),
        \`userAgent\` text,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        PRIMARY KEY (\`id\`)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`sessions\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`sessionId\` varchar(64) NOT NULL,
        \`licenseId\` int NOT NULL,
        \`tiktokUsername\` varchar(64) NOT NULL,
        \`status\` enum('active','paused','ended','error') NOT NULL DEFAULT 'active',
        \`pythonPid\` int,
        \`gameState\` json,
        \`teamSettings\` json,
        \`gameSettings\` json,
        \`giftConfig\` json,
        \`startedAt\` timestamp NOT NULL DEFAULT (now()),
        \`endedAt\` timestamp NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`sessions_sessionId_unique\` (\`sessionId\`)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`gameHistory\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`sessionId\` varchar(64) NOT NULL,
        \`licenseId\` int NOT NULL,
        \`tiktokUsername\` varchar(64) NOT NULL,
        \`finalScores\` json NOT NULL,
        \`statistics\` json NOT NULL,
        \`durationSeconds\` int,
        \`totalCardsOpened\` int DEFAULT 0,
        \`totalParticipants\` int DEFAULT 0,
        \`screenshotUrl\` text,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        PRIMARY KEY (\`id\`)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`appSettings\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`key\` varchar(128) NOT NULL,
        \`value\` text NOT NULL,
        \`category\` varchar(64) NOT NULL DEFAULT 'general',
        \`licenseId\` int,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`appSettings_key_unique\` (\`key\`)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`webhooks\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`name\` varchar(128) NOT NULL,
        \`eventType\` varchar(64) NOT NULL,
        \`url\` text NOT NULL,
        \`secret\` varchar(256),
        \`headers\` text,
        \`licenseId\` int,
        \`createdAt\` timestamp NOT NULL DEFAULT (now()),
        PRIMARY KEY (\`id\`)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS \`notificationLog\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`webhookId\` int NOT NULL,
        \`licenseId\` int NOT NULL,
        \`eventType\` varchar(64) NOT NULL,
        \`payload\` text,
        \`responseCode\` int,
        \`responseBody\` text,
        \`sentAt\` timestamp NOT NULL DEFAULT (now()),
        \`success\` boolean NOT NULL DEFAULT false,
        PRIMARY KEY (\`id\`)
      )
    `);

    await conn.end();
    console.log("[Server] ✓ Database tables ready");
  } catch (err) {
    console.error("[Server] DB init warning (non-fatal):", err);
  }

  const app = express();
  const server = createServer(app);
  initializeSocketServer(server);

  // Health check endpoint for Docker/Kubernetes
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Initialize Telegram bot (if token provided)
  if (process.env.TELEGRAM_BOT_TOKEN) {
    initializeTelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  }

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Custom redirects
  app.get("/licensepanel", async (req, res) => {
    // Check admin authentication
    const { getAdminTokenFromRequest, verifyAdminToken } = await import("../admin-auth");
    const token = getAdminTokenFromRequest(req);
    const isAdmin = token ? await verifyAdminToken(token) : false;

    if (!isAdmin) {
      return res.redirect("/admin-login.html");
    }

    // import.meta.dirname = /app/dist in production → go up one level to /app
    const filePath = path.resolve(import.meta.dirname, "..", "client", "public", "license-panel.html");
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send(`Not found: ${filePath}`);
    }
  });
  // Redirect old routes to licensepanel (single entry point)
  app.get("/license-panel.html", (req, res) => res.redirect("/licensepanel"));
  app.get("/admin-dashboard", (req, res) => res.redirect("/licensepanel"));
  app.get("/admin-dashboard.html", (req, res) => res.redirect("/licensepanel"));

  // Image proxy to bypass CORS
  app.get("/api/proxy-image", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send('Missing url parameter');
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.futwiz.com/'
        }
      });

      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch image');
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h
      res.setHeader('Access-Control-Allow-Origin', '*');

      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Image proxy error:', error);
      res.status(500).send('Failed to proxy image');
    }
  });

  // TikTok profil resmini getir (username'den) - proxy ile
  app.get("/api/tiktok-profile-pic", async (req, res) => {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Missing username parameter' });
    }

    try {
      const cleanUsername = username.replace(/^@/, '');

      // HTTPS proxy kullanarak TikTok'a eriş (proxy-cheap-server gibi)
      const proxyHost = 'https://proxy.smartproxy.com:1000'; // örnek proxy
      const tiktokUrl = 'https://www.tiktok.com/@' + cleanUsername;

      // Proxy olmadan direkt fetch (CORS bypass için proxy header)
      const response = await fetch(tiktokUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        }
      });

      if (!response.ok) {
        return res.status(404).json({ error: 'User not found' });
      }

      const html = await response.text();

      // HTML'den profil resmi URL'sini çıkar (tiktokcdn.com)
      const imgMatch = html.match(/(https:\/\/[a-z0-9\-\.]*tiktokcdn\.com\/[a-zA-Z0-9\-_\/\.]+\.(jpg|jpeg|png|webp))/);

      if (imgMatch) {
        const picUrl = imgMatch[1];

        // Resmi proxy ile döndür
        const imgResponse = await fetch(picUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            'Referer': tiktokUrl
          }
        });

        if (imgResponse.ok) {
          const buffer = await imgResponse.arrayBuffer();
          res.setHeader('Content-Type', imgResponse.headers.get('content-type') || 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.send(Buffer.from(buffer));
        } else {
          res.status(404).json({ error: 'Profile image not found' });
        }
      } else {
        res.status(404).json({ error: 'Profile image URL not found in page' });
      }
    } catch (error) {
      console.error('TikTok profile pic error:', error);
      res.status(500).json({ error: 'Failed to fetch TikTok profile' });
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Admin JWT auth routes: /api/admin/login, /api/admin/logout, /api/admin/me
  registerAdminAuthRoutes(app);
  // Player REST API
  registerPlayerRoutes(app);

  // License REST API endpoints (admin-protected)
  app.get('/api/licenses', requireAdmin, async (req, res) => {
    try {
      const licenses = await licenseManager.getAllLicenses();
      res.json(licenses);
    } catch (err) {
      console.error('Error getting licenses:', err);
      res.status(500).json({ error: 'Failed to get licenses' });
    }
  });

  app.patch('/api/licenses/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { licenseKey, username, tiktokUsername, expiresAt, usageCount, permissions, packageId } = req.body;

      const updateData: Record<string, unknown> = {};
      if (licenseKey !== undefined) updateData.licenseKey = licenseKey;
      if (username !== undefined) updateData.username = username;
      if (tiktokUsername !== undefined) updateData.tiktokUsername = tiktokUsername;
      if (expiresAt !== undefined) updateData.expiresAt = new Date(expiresAt);
      if (usageCount !== undefined) updateData.usageCount = usageCount;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (packageId !== undefined) updateData.packageId = packageId;

      const result = await licenseManager.updateLicense(id, updateData as any);
      res.json(result);
    } catch (err) {
      console.error('Error updating license:', err);
      res.status(500).json({ error: 'Failed to update license' });
    }
  });

  app.post('/api/licenses', requireAdmin, async (req, res) => {
    try {
      const { packageType, broadcasterName, broadcasterEmail, licenseDuration, maxSessions, maxPlayers } = req.body;
      const result = await licenseManager.createLicense(
        packageType || 'basic',
        broadcasterName || 'Unknown',
        broadcasterEmail || 'unknown@example.com',
        licenseDuration || 30,
        maxSessions || 1,
        maxPlayers || 11
      );
      res.json(result);
    } catch (err) {
      console.error('Error creating license:', err);
      res.status(500).json({ error: 'Failed to create license' });
    }
  });

  app.post('/api/licenses/:id/extend', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { days } = req.body;
      const result = await licenseManager.extendLicense(id, parseInt(days || 30));
      res.json(result);
    } catch (err) {
      console.error('Error extending license:', err);
      res.status(500).json({ error: 'Failed to extend license' });
    }
  });

  app.post('/api/licenses/:id/renew', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { days } = req.body;
      const result = await licenseManager.extendLicense(id, parseInt(days || 30));
      res.json(result);
    } catch (err) {
      console.error('Error renewing license:', err);
      res.status(500).json({ error: 'Failed to renew license' });
    }
  });

  app.delete('/api/licenses/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await licenseManager.revokeLicense(id);
      res.json({ success: true });
    } catch (err) {
      console.error('Error revoking license:', err);
      res.status(500).json({ error: 'Failed to revoke license' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ADMIN FEATURES API ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/admin/sessions - List all sessions with history
   */
  app.get("/api/admin/sessions", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ sessions: [], total: 0 });

      const { licenseId, status, limit = 50, offset = 0 } = req.query;

      const whereClause = [];
      if (licenseId) whereClause.push(eq(sessions.licenseId, Number(licenseId)));
      if (status) whereClause.push(eq(sessions.status, status as "active" | "paused" | "ended" | "error"));

      const where = whereClause.length > 0 ? and(...whereClause) : undefined;

      const [sessionData, totalCount] = await Promise.all([
        db.select().from(sessions).where(where).orderBy(desc(sessions.startedAt)).limit(Number(limit)).offset(Number(offset)),
        db.select({ count: sql`COUNT(*)` }).from(sessions).where(where)
      ]);

      res.json({
        sessions: sessionData,
        total: Number(totalCount[0]?.count || 0),
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (err) {
      console.error('[Admin] Sessions error:', err);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  /**
   * GET /api/admin/game-history - List game history with statistics
   */
  app.get("/api/admin/game-history", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ history: [], total: 0 });

      const { licenseId, startDate, endDate, limit = 50, offset = 0 } = req.query;

      const whereClause = [];
      if (licenseId) whereClause.push(eq(gameHistory.licenseId, Number(licenseId)));
      if (startDate) whereClause.push(sql`gameHistory.createdAt >= ${startDate}`);
      if (endDate) whereClause.push(sql`gameHistory.createdAt <= ${endDate}`);

      const where = whereClause.length > 0 ? and(...whereClause) : undefined;

      const [historyData, totalCount] = await Promise.all([
        db.select().from(gameHistory).where(where).orderBy(desc(gameHistory.createdAt)).limit(Number(limit)).offset(Number(offset)),
        db.select({ count: sql`COUNT(*)` }).from(gameHistory).where(where)
      ]);

      res.json({
        history: historyData,
        total: Number(totalCount[0]?.count || 0),
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (err) {
      console.error('[Admin] Game history error:', err);
      res.status(500).json({ error: 'Failed to fetch game history' });
    }
  });

  /**
   * GET /api/admin/stats/dashboard - Dashboard statistics
   */
  app.get("/api/admin/stats/dashboard", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ error: "Database unavailable" });

      const [licensesResult, sessionsResult, historyResult] = await Promise.all([
        db.select({ count: sql`COUNT(*)` }).from(licensesTable),
        db.select({ count: sql`COUNT(*)` }).from(sessions).where(eq(sessions.status, 'active')),
        db.select({
          totalCards: sql`SUM(totalCardsOpened)`,
          totalSessions: sql`COUNT(*)`,
          avgDuration: sql`AVG(durationSeconds)`
        }).from(gameHistory)
      ]);

      const activeLicenses = await db.select().from(licensesTable).where(eq(licensesTable.status, 'active'));

      res.json({
        totalLicenses: Number(licensesResult[0]?.count || 0),
        activeLicenses: activeLicenses.length,
        activeSessions: Number(sessionsResult[0]?.count || 0),
        totalGamesPlayed: Number(historyResult[0]?.totalSessions || 0),
        totalCardsOpened: Number(historyResult[0]?.totalCards || 0),
        avgGameDuration: Math.round(Number(historyResult[0]?.avgDuration || 0) / 60) // minutes
      });
    } catch (err) {
      console.error('[Admin] Dashboard stats error:', err);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  });

  /**
   * GET /api/admin/license-logs - License usage logs with filtering
   */
  app.get("/api/admin/license-logs", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ logs: [], total: 0 });

      const { licenseId, action, limit = 100, offset = 0, search } = req.query;

      const whereClause = [];
      if (licenseId) whereClause.push(eq(licenseLogs.licenseId, Number(licenseId)));
      if (action) whereClause.push(like(licenseLogs.action, `%${action}%`));
      if (search) {
        whereClause.push(
          or(
            like(licenseLogs.action, `%${search}%`),
            like(licenseLogs.details, `%${search}%`),
            like(licenseLogs.ipAddress, `%${search}%`)
          )
        );
      }

      const where = whereClause.length > 0 ? and(...whereClause) : undefined;

      const [logsData, totalCount] = await Promise.all([
        db.select().from(licenseLogs).where(where).orderBy(desc(licenseLogs.createdAt)).limit(Number(limit)).offset(Number(offset)),
        db.select({ count: sql`COUNT(*)` }).from(licenseLogs).where(where)
      ]);

      res.json({
        logs: logsData,
        total: Number(totalCount[0]?.count || 0),
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (err) {
      console.error('[Admin] License logs error:', err);
      res.status(500).json({ error: 'Failed to fetch license logs' });
    }
  });

  /**
   * POST /api/admin/licenses/bulk - Bulk license operations
   */
  app.post("/api/admin/licenses/bulk", requireAdmin, async (req, res) => {
    try {
      const { action, licenseIds, data } = req.body;

      if (!action || !Array.isArray(licenseIds) || licenseIds.length === 0) {
        return res.status(400).json({ error: 'action and licenseIds are required' });
      }

      const db = await getDb();
      if (!db) return res.status(500).json({ error: 'Database unavailable' });

      const results = [];

      for (const licenseId of licenseIds) {
        try {
          let result;
          switch (action) {
            case 'extend':
              const days = data?.days || 30;
              result = await db
                .update(licensesTable)
                .set({
                  expiresAt: sql`DATE_ADD(expiresAt, INTERVAL ${days} DAY)`
                })
                .where(eq(licensesTable.id, Number(licenseId)));
              results.push({ licenseId, success: true, action: 'extended', days });
              break;

            case 'changeStatus':
              result = await db
                .update(licensesTable)
                .set({ status: data?.status })
                .where(eq(licensesTable.id, Number(licenseId)));
              results.push({ licenseId, success: true, action: 'statusChanged', status: data?.status });
              break;

            case 'delete':
              result = await db
                .delete(licensesTable)
                .where(eq(licensesTable.id, Number(licenseId)));
              results.push({ licenseId, success: true, action: 'deleted' });
              break;

            default:
              results.push({ licenseId, success: false, error: 'Unknown action' });
          }
        } catch (err) {
          results.push({ licenseId, success: false, error: (err as Error).message });
        }
      }

      res.json({ results, processed: results.length, succeeded: results.filter(r => r.success).length });
    } catch (err) {
      console.error('[Admin] Bulk operation error:', err);
      res.status(500).json({ error: 'Bulk operation failed' });
    }
  });

  /**
   * GET /api/admin/settings - Get app settings
   */
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ settings: [] });

      const { category, licenseId } = req.query;
      const whereClause = [];
      if (category) whereClause.push(eq(appSettings.category, category as string));
      if (licenseId) whereClause.push(eq(appSettings.licenseId, Number(licenseId)));
      // If no licenseId specified, get only global settings (NULL licenseId)
      else whereClause.push(sql`licenseId IS NULL`);

      const where = whereClause.length > 0 ? and(...whereClause) : sql`licenseId IS NULL`;

      const settings = await db.select().from(appSettings).where(where).orderBy(appSettings.key);

      // Convert to key-value object
      const settingsObj: Record<string, any> = {};
      settings.forEach((s: typeof appSettings.$inferSelect) => {
        try {
          settingsObj[s.key] = JSON.parse(s.value);
        } catch {
          settingsObj[s.key] = s.value;
        }
      });

      res.json(settingsObj);
    } catch (err) {
      console.error('[Admin] Get settings error:', err);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  /**
   * POST /api/admin/settings - Upsert app settings
   */
  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: 'Database unavailable' });

      const settings = req.body; // { key: value } object
      const results = [];

      for (const [key, value] of Object.entries(settings)) {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);

        if (existing.length > 0) {
          await db.update(appSettings)
            .set({ value: valueStr, updatedAt: new Date() })
            .where(eq(appSettings.key, key));
        } else {
          await db.insert(appSettings).values({
            key,
            value: valueStr,
            category: 'general'
          });
        }
        results.push(key);
      }

      res.json({ success: true, updated: results });
    } catch (err) {
      console.error('[Admin] Save settings error:', err);
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  /**
   * GET /api/admin/webhooks - List webhooks
   */
  app.get("/api/admin/webhooks", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ webhooks: [] });

      const { licenseId, eventType } = req.query;
      const whereClause = [];
      if (licenseId) whereClause.push(eq(webhooks.licenseId, Number(licenseId)));
      else whereClause.push(sql`licenseId IS NULL`);
      if (eventType) whereClause.push(eq(webhooks.eventType, eventType as string));

      const where = whereClause.length > 0 ? and(...whereClause) : sql`licenseId IS NULL`;

      const hooks = await db.select().from(webhooks).where(where).orderBy(desc(webhooks.createdAt));

      res.json({ webhooks: hooks });
    } catch (err) {
      console.error('[Admin] Get webhooks error:', err);
      res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
  });

  /**
   * POST /api/admin/webhooks - Create webhook
   */
  app.post("/api/admin/webhooks", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: 'Database unavailable' });

      const { name, eventType, url, secret, headers } = req.body;

      if (!name || !eventType || !url) {
        return res.status(400).json({ error: 'name, eventType, and url are required' });
      }

      await db.insert(webhooks).values({
        name,
        eventType,
        url,
        secret: secret || null,
        headers: headers || null
      });

      const [webhook] = await db.select().from(webhooks).where(eq(webhooks.name, name)).limit(1);

      res.json({ success: true, webhook });
    } catch (err) {
      console.error('[Admin] Create webhook error:', err);
      res.status(500).json({ error: 'Failed to create webhook' });
    }
  });

  /**
   * DELETE /api/admin/webhooks/:id - Delete webhook
   */
  app.delete("/api/admin/webhooks/:id", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: 'Database unavailable' });

      await db.delete(webhooks).where(eq(webhooks.id, Number(req.params.id)));

      res.json({ success: true });
    } catch (err) {
      console.error('[Admin] Delete webhook error:', err);
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  });

  /**
   * POST /api/admin/webhooks/:id/test - Test webhook
   */
  app.post("/api/admin/webhooks/:id/test", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: 'Database unavailable' });

      const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, Number(req.params.id))).limit(1);

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      // Send test payload
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        message: 'This is a test notification from Kadrokur Admin Panel'
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.headers ? JSON.parse(webhook.headers as string) : {})
        },
        body: JSON.stringify(testPayload)
      });

      // Log the test
      await db.insert(notificationLog).values({
        webhookId: webhook.id,
        licenseId: webhook.licenseId || 0,
        eventType: 'test',
        payload: JSON.stringify(testPayload),
        responseCode: response.status,
        responseBody: await response.text(),
        sentAt: new Date(),
        success: response.ok
      });

      res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      });
    } catch (err) {
      console.error('[Admin] Test webhook error:', err);
      res.status(500).json({ error: 'Failed to test webhook' });
    }
  });

  /**
   * GET /api/admin/notification-log - Notification delivery log
   */
  app.get("/api/admin/notification-log", requireAdmin, async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ logs: [], total: 0 });

      const { limit = 50, offset = 0 } = req.query;

      const [logsData, totalCount] = await Promise.all([
        db.select().from(notificationLog).orderBy(desc(notificationLog.sentAt)).limit(Number(limit)).offset(Number(offset)),
        db.select({ count: sql`COUNT(*)` }).from(notificationLog)
      ]);

      res.json({
        logs: logsData,
        total: Number(totalCount[0]?.count || 0),
        limit: Number(limit),
        offset: Number(offset)
      });
    } catch (err) {
      console.error('[Admin] Notification log error:', err);
      res.status(500).json({ error: 'Failed to fetch notification log' });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // END ADMIN FEATURES API ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // GIFT MANAGEMENT API ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/gifts/public - List gifts without auth (for game screen settings)
   */
  app.get("/api/gifts/public", async (req, res) => {
    try {
      const { search, minCost, maxCost, quality, limit, offset } = req.query;

      const result = await getAllGifts({
        search: search as string,
        minCost: minCost ? Number(minCost) : undefined,
        maxCost: maxCost ? Number(maxCost) : undefined,
        quality: quality as "bronze" | "silver" | "gold" | "elite" | undefined,
        limit: limit ? Number(limit) : 500,
        offset: offset ? Number(offset) : 0,
      });

      res.json(result);
    } catch (err) {
      console.error("Error getting gifts (public):", err);
      res.status(500).json({ error: "Failed to get gifts" });
    }
  });

  /**
   * GET /api/gifts - List all gifts with filtering
   */
  app.get("/api/gifts", requireAdmin, async (req, res) => {
    try {
      const { getAllGifts } = await import("../gift-manager");
      const { search, minCost, maxCost, quality, limit, offset } = req.query;

      const result = await getAllGifts({
        search: search as string,
        minCost: minCost ? Number(minCost) : undefined,
        maxCost: maxCost ? Number(maxCost) : undefined,
        quality: quality as any,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      });

      res.json(result);
    } catch (err) {
      console.error("Error getting gifts:", err);
      res.status(500).json({ error: "Failed to get gifts" });
    }
  });

  /**
   * PATCH /api/gifts/:id - Update gift card quality
   */
  app.patch("/api/gifts/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { cardQuality } = req.body;

      if (!cardQuality || !["bronze", "silver", "gold", "elite"].includes(cardQuality)) {
        return res.status(400).json({ error: "Invalid cardQuality. Must be: bronze, silver, gold, or elite" });
      }

      const result = await updateGiftQuality(Number(id), cardQuality);
      res.json(result);
    } catch (err) {
      console.error("Error updating gift:", err);
      res.status(500).json({ error: "Failed to update gift" });
    }
  });

  /**
   * GET /api/sessions/:sessionId/gifts - Get session's active gift config
   */
  app.get("/api/sessions/:sessionId/gifts", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ activeGiftIds: [] });

      const [session] = await db.select().from(sessions).where(eq(sessions.sessionId, req.params.sessionId)).limit(1);

      if (!session) return res.status(404).json({ error: "Session not found" });

      const giftConfig = session.giftConfig as any;
      res.json({ activeGiftIds: giftConfig?.activeGiftIds || [] });
    } catch (err) {
      console.error("Get session gifts error:", err);
      res.status(500).json({ error: "Failed to get session gifts" });
    }
  });

  /**
   * PUT /api/sessions/:sessionId/gifts - Update session's active gift config
   */
  app.put("/api/sessions/:sessionId/gifts", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database unavailable" });

      const { activeGiftIds } = req.body;

      await db.update(sessions)
        .set({ giftConfig: { activeGiftIds } })
        .where(eq(sessions.sessionId, req.params.sessionId));

      res.json({ success: true, activeGiftIds });
    } catch (err) {
      console.error("Update session gifts error:", err);
      res.status(500).json({ error: "Failed to update session gifts" });
    }
  });

  /**
   * GET /api/public/gifts - Public endpoint for listing gifts (read-only, no auth required)
   * Used by game-screen.html for the gift gallery demo feature
   */
  app.get("/api/public/gifts", async (req, res) => {
    const { search, minCost, maxCost, quality, limit, offset } = req.query;

    const getQuality = (cost: number): string => {
      if (cost >= 200) return "elite";
      if (cost >= 50) return "gold";
      if (cost >= 10) return "silver";
      return "bronze";
    };

    const serveFromJson = () => {
      const giftsDbPath = path.resolve(import.meta.dirname, "../../gifts-db.json");
      const raw = JSON.parse(fs.readFileSync(giftsDbPath, "utf-8")) as Record<string, { id: number; name: string; image: string; diamondCost: number }>;
      let items = Object.values(raw).map(g => ({
        id: g.id,
        giftName: g.name || `Gift #${g.id}`,
        image: g.image,
        diamondCost: g.diamondCost,
        cardQuality: getQuality(g.diamondCost),
      }));
      if (search) items = items.filter(g => g.giftName.toLowerCase().includes((search as string).toLowerCase()));
      if (minCost) items = items.filter(g => g.diamondCost >= Number(minCost));
      if (maxCost) items = items.filter(g => g.diamondCost <= Number(maxCost));
      if (quality) items = items.filter(g => g.cardQuality === quality);
      items.sort((a, b) => b.diamondCost - a.diamondCost);
      const lim = limit ? Number(limit) : 500;
      const off = offset ? Number(offset) : 0;
      return { gifts: items.slice(off, off + lim), total: items.length, limit: lim, offset: off };
    };

    try {
      const { getAllGifts } = await import("../gift-manager");
      const result = await getAllGifts({
        search: search as string,
        minCost: minCost ? Number(minCost) : undefined,
        maxCost: maxCost ? Number(maxCost) : undefined,
        quality: quality as any,
        limit: limit ? Number(limit) : 500,
        offset: offset ? Number(offset) : 0,
      });

      if (result.gifts.length > 0) {
        return res.json(result);
      }
    } catch (err) {
      console.warn("[Gifts] DB sorgusu başarısız, gifts-db.json'a düşülüyor:", (err as Error).message);
    }

    try {
      res.json(serveFromJson());
    } catch (err) {
      console.error("Error getting public gifts:", err);
      res.status(500).json({ error: "Failed to get gifts" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // END GIFT MANAGEMENT API ROUTES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
