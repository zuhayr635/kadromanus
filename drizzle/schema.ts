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
  position: varchar("position", { length: 32 }).notNull(),
  rating: int("rating").default(75),
  nationality: varchar("nationality", { length: 64 }),
  imageUrl: text("imageUrl"),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

export const giftTiers = mysqlTable("giftTiers", {
  id: int("id").autoincrement().primaryKey(),
  giftName: varchar("giftName", { length: 64 }).notNull().unique(),
  giftId: int("giftId").notNull(),
  tierLevel: mysqlEnum("tierLevel", ["1", "2", "3"]).notNull(),
  cardQuality: mysqlEnum("cardQuality", ["bronze", "silver", "gold", "elite"]).notNull(),
});

export type GiftTier = typeof giftTiers.$inferSelect;
export type InsertGiftTier = typeof giftTiers.$inferInsert;