import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Kadrokur-specific tables

export const licenses = mysqlTable("licenses", {
  id: int("id").autoincrement().primaryKey(),
  licenseKey: varchar("licenseKey", { length: 64 }).notNull().unique(),
  ownerName: text("ownerName").notNull(),
  ownerEmail: varchar("ownerEmail", { length: 320 }),
  ownerTikTok: varchar("ownerTikTok", { length: 64 }),
  planType: mysqlEnum("planType", ["basic", "pro", "premium", "unlimited"]).default("basic").notNull(),
  status: mysqlEnum("status", ["active", "suspended", "expired", "revoked"]).default("active").notNull(),
  maxSessions: int("maxSessions").default(1).notNull(),
  allowedFeatures: json("allowedFeatures"),
  totalUsageCount: int("totalUsageCount").default(0),
  lastUsedAt: timestamp("lastUsedAt"),
  lastUsedIp: varchar("lastUsedIp", { length: 45 }),
  activatedAt: timestamp("activatedAt"),
  expiresAt: timestamp("expiresAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type License = typeof licenses.$inferSelect;
export type InsertLicense = typeof licenses.$inferInsert;

export const licenseLogs = mysqlTable("licenseLogs", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LicenseLog = typeof licenseLogs.$inferSelect;
export type InsertLicenseLog = typeof licenseLogs.$inferInsert;

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  licenseId: int("licenseId").notNull(),
  tiktokUsername: varchar("tiktokUsername", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["active", "paused", "ended", "error"]).default("active").notNull(),
  pythonPid: int("pythonPid"),
  gameState: json("gameState"),
  teamSettings: json("teamSettings"),
  gameSettings: json("gameSettings"),
  giftConfig: json("giftConfig"), // { activeGiftIds: number[], customMappings?: Record<number, CardQuality> }
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

export const gameHistory = mysqlTable("gameHistory", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  licenseId: int("licenseId").notNull(),
  tiktokUsername: varchar("tiktokUsername", { length: 64 }).notNull(),
  finalScores: json("finalScores").notNull(),
  statistics: json("statistics").notNull(),
  durationSeconds: int("durationSeconds"),
  totalCardsOpened: int("totalCardsOpened").default(0),
  totalParticipants: int("totalParticipants").default(0),
  screenshotUrl: text("screenshotUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GameHistory = typeof gameHistory.$inferSelect;
export type InsertGameHistory = typeof gameHistory.$inferInsert;

export const usedPlayers = mysqlTable("usedPlayers", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  playerId: int("playerId").notNull(),
  teamIndex: int("teamIndex").notNull(),
  position: varchar("position", { length: 32 }).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  replacedBy: int("replacedBy"),
});

export type UsedPlayer = typeof usedPlayers.$inferSelect;
export type InsertUsedPlayer = typeof usedPlayers.$inferInsert;

export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  team: varchar("team", { length: 64 }).notNull(),
  league: varchar("league", { length: 64 }),
  nation: varchar("nation", { length: 64 }),
  position: varchar("position", { length: 8 }).notNull(),
  // Card quality based on overall rating
  overall: int("overall").notNull(),
  // Detailed card stats (FUT style)
  pace: int("pace"),
  shooting: int("shooting"),
  passing: int("passing"),
  dribbling: int("dribbling"),
  defending: int("defending"),
  physical: int("physical"),
  // Goalkeeper stats (if position is GK)
  diving: int("diving"),
  handling: int("handling"),
  kicking: int("kicking"),
  positioning: int("positioningGk"),
  reflexes: int("reflexes"),
  // Visual
  imageUrl: text("imageUrl"),
  faceImageUrl: text("faceImageUrl"),
  // Meta
  height: int("height"), // cm
  weight: int("weight"), // kg
  preferredFoot: mysqlEnum("preferredFoot", ["left", "right"]),
  weakFoot: int("weakFoot").default(3), // 1-5 stars
  skillMoves: int("skillMoves").default(3), // 1-5 stars
  // Value (optional, for sorting/weighting)
  marketValue: int("marketValue"), // in thousands EUR
  // Card quality tier (computed from overall)
  cardQuality: mysqlEnum("cardQuality", ["bronze", "silver", "gold", "elite"]).notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

export const giftTiers = mysqlTable("giftTiers", {
  id: int("id").autoincrement().primaryKey(),
  giftName: varchar("giftName", { length: 64 }).notNull().unique(),
  giftId: int("giftId").notNull(),
  image: text("image"),
  diamondCost: int("diamondCost").notNull().default(0),
  tierLevel: mysqlEnum("tierLevel", ["1", "2", "3"]).notNull(),
  cardQuality: mysqlEnum("cardQuality", ["bronze", "silver", "gold", "elite"]).notNull(),
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ADMIN FEATURES - NEW TABLES
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Card Packs - Custom card sets with filters
 * Allows admins to create curated card packs (e.g., "Süper Lig Special", "Elite Only")
 */
export const cardPacks = mysqlTable("cardPacks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  // Filters stored as JSON: { qualities: [], leagues: [], positions: [], minOverall: 0, maxOverall: 99 }
  filters: json("filters").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CardPack = typeof cardPacks.$inferSelect;
export type InsertCardPack = typeof cardPacks.$inferInsert;

/**
 * License Card Packs - Link licenses to available card packs
 * Determines which packs a license can use
 */
export const licenseCardPacks = mysqlTable("licenseCardPacks", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull(),
  packId: int("packId").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export type LicenseCardPack = typeof licenseCardPacks.$inferSelect;
export type InsertLicenseCardPack = typeof licenseCardPacks.$inferInsert;

/**
 * App Settings - Global and per-license settings
 * Stores team names, colors, thresholds, theme options
 */
export const appSettings = mysqlTable("appSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value").notNull(), // JSON string for complex values
  category: varchar("category", { length: 64 }).notNull(), // 'theme', 'teams', 'thresholds', 'notifications'
  licenseId: int("licenseId"), // NULL = global setting, INT = per-license override
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = typeof appSettings.$inferInsert;

/**
 * Webhooks - For notifications and integrations
 * Send events to Discord, Telegram, Slack, or custom endpoints
 */
export const webhooks = mysqlTable("webhooks", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId"), // NULL = global webhook
  name: varchar("name", { length: 128 }).notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(), // 'license.expiring', 'session.started', 'card.opened', etc.
  url: text("url").notNull(),
  secret: varchar("secret", { length: 128 }), // HMAC signature for security
  isActive: boolean("isActive").default(true).notNull(),
  headers: json("headers"), // Custom headers
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

/**
 * Notification Log - Track webhook/notification deliveries
 */
export const notificationLog = mysqlTable("notificationLog", {
  id: int("id").autoincrement().primaryKey(),
  webhookId: int("webhookId"),
  licenseId: int("licenseId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  payload: json("payload"), // Request body sent
  responseCode: int("responseCode"), // HTTP status code
  responseBody: text("responseBody"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  success: boolean("success").notNull(),
});

export type NotificationLogEntry = typeof notificationLog.$inferSelect;
export type InsertNotificationLogEntry = typeof notificationLog.$inferInsert;

export type GiftTier = typeof giftTiers.$inferSelect;
export type InsertGiftTier = typeof giftTiers.$inferInsert;