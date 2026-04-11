import { Express } from "express";
import { getDb } from "./db";
import { players } from "../drizzle/schema";
import { eq, like, sql, and, or, desc, asc } from "drizzle-orm";

export function registerPlayerRoutes(app: Express) {
  /**
   * GET /api/players/stats
   * Oyuncu istatistikleri (kart sayıları vb.)
   */
  app.get("/api/players/stats", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ stats: [], leagues: [] });

      const stats = await db
        .select({
          cardQuality: players.cardQuality,
          count: sql<number>`count(*)`.as('count'),
          avgOverall: sql<number>`avg(${players.overall})`.as('avgOverall'),
        })
        .from(players)
        .groupBy(players.cardQuality);

      const leagues = await db
        .select({
          league: players.league,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(players)
        .where(sql`league IS NOT NULL`)
        .groupBy(players.league)
        .orderBy(desc(sql`count(*)`));

      return res.json({
        stats: stats.map(s => ({ ...s, count: Number(s.count), avgOverall: Number(s.avgOverall) })),
        leagues: leagues.map(l => ({ ...l, count: Number(l.count) })),
      });
    } catch (error) {
      console.error("[API] /api/players/stats error:", error);
      return res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  /**
   * GET /api/players/leagues
   * Lig listesi
   */
  app.get("/api/players/leagues", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json([]);

      const leagues = await db
        .select({
          league: players.league,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(players)
        .where(sql`league IS NOT NULL`)
        .groupBy(players.league)
        .orderBy(desc(sql`count(*)`));

      return res.json(leagues.map(l => ({ ...l, count: Number(l.count) })));
    } catch (error) {
      console.error("[API] /api/players/leagues error:", error);
      return res.status(500).json({ error: "Failed to fetch leagues" });
    }
  });

  /**
   * GET /api/players/image-stats
   * Fotoğraf coverage istatistikleri
   */
  app.get("/api/players/image-stats", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json({ total: 0, withImage: 0 });

      const totalResult = await db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(players);

      const withImageResult = await db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(players)
        .where(sql`faceImageUrl IS NOT NULL AND faceImageUrl != ''`);

      return res.json({
        total: Number(totalResult[0]?.count || 0),
        withImage: Number(withImageResult[0]?.count || 0),
      });
    } catch (error) {
      console.error("[API] /api/players/image-stats error:", error);
      return res.status(500).json({ error: "Failed to fetch image stats" });
    }
  });

  /**
   * GET /api/players/:id
   * Tekil oyuncu detayını getir
   */
  app.get("/api/players/:id", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database not available" });
      }

      const playerId = parseInt(req.params.id);
      if (isNaN(playerId)) {
        return res.status(400).json({ error: "Invalid player ID" });
      }

      const playerList = await db
        .select()
        .from(players)
        .where(eq(players.id, playerId))
        .limit(1);

      if (!playerList || playerList.length === 0) {
        return res.status(404).json({ error: "Player not found" });
      }

      return res.json(playerList[0]);
    } catch (error) {
      console.error("[PlayerAPI] Error fetching player:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/players
   * Query params: cardQuality, league, position, search, page, limit, sortBy, sortOrder
   */
  app.get("/api/players", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.json({ players: [], total: 0, page: 1, limit: 20, totalPages: 0 });
      }

      const {
        cardQuality,
        league,
        position,
        search,
        sortBy = "overall",
        sortOrder = "desc",
        page = "1",
        limit = "20",
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 20, 100);

      const conditions = [];

      if (cardQuality && ["bronze", "silver", "gold", "elite"].includes(cardQuality as string)) {
        conditions.push(eq(players.cardQuality, cardQuality as any));
      }
      if (league && typeof league === "string") {
        conditions.push(eq(players.league, league));
      }
      if (position && typeof position === "string") {
        conditions.push(eq(players.position, position));
      }
      if (search && typeof search === "string") {
        conditions.push(
          or(
            like(players.name, `%${search}%`),
            like(players.team, `%${search}%`),
            like(players.nation, `%${search}%`)
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const sortColumn = {
        overall: players.overall,
        name: players.name,
        pace: players.pace,
        shooting: players.shooting,
        passing: players.passing,
        dribbling: players.dribbling,
        defending: players.defending,
        physical: players.physical,
      }[sortBy as string] || players.overall;

      const orderFn = sortOrder === "asc" ? asc : desc;
      const offset = (pageNum - 1) * limitNum;

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(players)
          .where(where)
          .orderBy(orderFn(sortColumn))
          .limit(limitNum)
          .offset(offset),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(players)
          .where(where),
      ]);

      res.json({
        players: data,
        total: Number(countResult[0]?.count) || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((Number(countResult[0]?.count) || 0) / limitNum),
      });
    } catch (error) {
      console.error("[API] /api/players error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  /**
   * GET /api/players/positions
   * Returns distinct positions
   */
  app.get("/api/players/positions", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.json([]);

      const result = await db
        .selectDistinct({ position: players.position })
        .from(players)
        .orderBy(asc(players.position));

      res.json(result.map(r => r.position));
    } catch (error) {
      console.error("[API] /api/players/positions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
