import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { players } from "../../drizzle/schema";
import { eq, like, sql, and, or, desc, asc } from "drizzle-orm";
import { getDb } from "../db";

export const playersRouter = router({
  /**
   * Get all players with optional filtering
   */
  getAll: publicProcedure
    .input(
      z
        .object({
          cardQuality: z.enum(["bronze", "silver", "gold", "elite"]).optional(),
          league: z.string().optional(),
          position: z.string().optional(),
          search: z.string().optional(),
          sortBy: z.enum(["overall", "name", "pace", "shooting", "passing", "dribbling", "defending", "physical"]).optional(),
          sortOrder: z.enum(["asc", "desc"]).optional(),
          page: z.number().min(1).optional(),
          limit: z.number().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { players: [], total: 0, page: 1, limit: 50, totalPages: 0 };
      const {
        cardQuality,
        league,
        position,
        search,
        sortBy = "overall",
        sortOrder = "desc",
        page = 1,
        limit = 50,
      } = input || {};

      const conditions = [];

      if (cardQuality) {
        conditions.push(eq(players.cardQuality, cardQuality));
      }
      if (league) {
        conditions.push(eq(players.league, league));
      }
      if (position) {
        conditions.push(eq(players.position, position));
      }
      if (search) {
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
      }[sortBy] || players.overall;

      const orderFn = sortOrder === "asc" ? asc : desc;

      const offset = (page - 1) * limit;

      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(players)
          .where(where)
          .orderBy(orderFn(sortColumn))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(players)
          .where(where),
      ]);

      return {
        players: data,
        total: countResult[0]?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((countResult[0]?.count || 0) / limit),
      };
    }),

  /**
   * Get stats summary
   */
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { stats: [], leagues: [] };

    const stats = await db
      .select({
        cardQuality: players.cardQuality,
        count: sql<number>`COUNT(*)`,
        avgOverall: sql<number>`ROUND(AVG(overall))`,
      })
      .from(players)
      .groupBy(players.cardQuality);

    const leagues = await db
      .select({
        league: players.league,
        count: sql<number>`COUNT(*)`,
      })
      .from(players)
      .groupBy(players.league)
      .orderBy(desc(sql`COUNT(*)`));

    return { stats, leagues };
  }),

  /**
   * Get distinct leagues
   */
  getLeagues: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db
      .selectDistinct({ league: players.league })
      .from(players)
      .where(sql`${players.league} IS NOT NULL AND ${players.league} != ''`)
      .orderBy(asc(players.league));
    return result.map((r) => r.league).filter(Boolean);
  }),

  /**
   * Get distinct positions
   */
  getPositions: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const result = await db
      .selectDistinct({ position: players.position })
      .from(players)
      .orderBy(asc(players.position));
    return result.map((r) => r.position);
  }),
});
