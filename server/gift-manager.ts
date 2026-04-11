import { getDb } from "./db";
import { giftTiers } from "../drizzle/schema";
import { eq, and, gte, lte, like, sql, desc } from "drizzle-orm";

export interface GiftFilters {
  search?: string;
  minCost?: number;
  maxCost?: number;
  quality?: "bronze" | "silver" | "gold" | "elite";
  limit?: number;
  offset?: number;
}

export async function getAllGifts(filters: GiftFilters = {}) {
  const db = await getDb();
  if (!db) return { gifts: [], total: 0 };

  const { search, minCost, maxCost, quality, limit = 50, offset = 0 } = filters;

  const whereClause = [];
  if (search) whereClause.push(like(giftTiers.giftName, `%${search}%`));
  if (minCost !== undefined) whereClause.push(gte(giftTiers.diamondCost, minCost));
  if (maxCost !== undefined) whereClause.push(lte(giftTiers.diamondCost, maxCost));
  if (quality) whereClause.push(eq(giftTiers.cardQuality, quality));

  const where = whereClause.length > 0 ? and(...whereClause) : undefined;

  const [gifts, totalCount] = await Promise.all([
    db.select().from(giftTiers).where(where).orderBy(desc(giftTiers.diamondCost)).limit(limit).offset(offset),
    db.select({ count: sql`COUNT(*)` }).from(giftTiers).where(where),
  ]);

  return {
    gifts,
    total: Number(totalCount[0]?.count || 0),
    limit,
    offset,
  };
}

export async function updateGiftQuality(giftId: number, cardQuality: "bronze" | "silver" | "gold" | "elite") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db.update(giftTiers).set({ cardQuality }).where(eq(giftTiers.id, giftId));

  const [updated] = await db.select().from(giftTiers).where(eq(giftTiers.id, giftId)).limit(1);
  return updated;
}
