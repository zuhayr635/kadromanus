/**
 * ELITE TIER PLAYERS BATCH 2
 * 30 elite tier players (OVR 89-93)
 * World-class superstars
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { players } from "../drizzle/schema.ts";
import dotenv from "dotenv";

dotenv.config();

// Helper to calculate card quality
function getCardQuality(overall) {
  if (overall >= 89) return "elite";
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

// ELITE TIER PLAYERS (89-93)
const elitePlayers = [
  // Forwards - Elite
  { name: "Neymar Jr", team: "Al-Hilal", league: "Saudi Pro League", nation: "Brazil", position: "LW", overall: 89, pace: 86, shooting: 84, passing: 86, dribbling: 92, defending: 29, physical: 67, height: 175, weight: 68, preferredFoot: "right", weakFoot: 5, skillMoves: 5 },
  { name: "Karim Benzema", team: "Al-Ittihad", league: "Saudi Pro League", nation: "France", position: "ST", overall: 89, pace: 78, shooting: 90, passing: 82, dribbling: 86, defending: 39, physical: 79, height: 185, weight: 80, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Antoine Griezmann", team: "Atlético Madrid", league: "La Liga", nation: "France", position: "CAM", overall: 89, pace: 82, shooting: 86, passing: 81, dribbling: 87, defending: 48, physical: 72, height: 176, weight: 73, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Sadio Mané", team: "Al-Nassr", league: "Saudi Pro League", nation: "Senegal", position: "LW", overall: 89, pace: 89, shooting: 87, passing: 79, dribbling: 88, defending: 33, physical: 73, height: 173, weight: 69, preferredFoot: "left", weakFoot: 4, skillMoves: 5 },
  { name: "Ángel Di María", team: "Benfica", league: "Série A", nation: "Argentina", position: "RW", overall: 88, pace: 85, shooting: 83, passing: 84, dribbling: 86, defending: 31, physical: 66, height: 180, weight: 68, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },

  // Goalkeepers - Elite
  { name: "Manuel Neuer", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "GK", overall: 89, diving: 88, handling: 86, kicking: 91, positioningGk: 88, reflexes: 87, pace: 47, physical: 82, height: 193, weight: 92, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },
  { name: "Thibaut Courtois", team: "Real Madrid", league: "La Liga", nation: "Belgium", position: "GK", overall: 89, diving: 88, handling: 87, kicking: 75, positioningGk: 88, reflexes: 89, pace: 47, physical: 89, height: 199, weight: 96, preferredFoot: "left", weakFoot: 2, skillMoves: 1 },
  { name: "Jan Oblak", team: "Atlético Madrid", league: "La Liga", nation: "Slovenia", position: "GK", overall: 91, diving: 90, handling: 88, kicking: 72, positioningGk: 91, reflexes: 92, pace: 46, physical: 87, height: 188, weight: 87, preferredFoot: "left", weakFoot: 2, skillMoves: 1 },
  { name: "Alisson Becker", team: "Liverpool", league: "Premier League", nation: "Brazil", position: "GK", overall: 89, diving: 90, handling: 85, kicking: 86, positioningGk: 89, reflexes: 89, pace: 51, physical: 90, height: 193, weight: 91, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },
  { name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Italy", position: "GK", overall: 89, diving: 86, handling: 84, kicking: 80, positioningGk: 87, reflexes: 88, pace: 55, physical: 87, height: 196, weight: 90, preferredFoot: "right", weakFoot: 4, skillMoves: 1 },

  // Midfielders - Elite
  { name: "Casemiro", team: "Manchester United", league: "Premier League", nation: "Brazil", position: "CDM", overall: 89, pace: 70, shooting: 76, passing: 80, dribbling: 76, defending: 89, physical: 88, height: 184, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "N'Golo Kanté", team: "Al-Ittihad", league: "Saudi Pro League", nation: "France", position: "CDM", overall: 89, pace: 82, shooting: 64, passing: 76, dribbling: 81, defending: 88, physical: 83, height: 168, weight: 59, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Andriy Shevchenko", team: "Dynamo Kyiv", league: "Ukrainian Premier League", nation: "Ukraine", position: "ST", overall: 89, pace: 85, shooting: 89, passing: 78, dribbling: 86, defending: 31, physical: 74, height: 185, weight: 78, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },

  // Defenders - Elite
  { name: "Sergio Ramos", team: "Sevilla", league: "La Liga", nation: "Spain", position: "CB", overall: 89, pace: 76, shooting: 63, passing: 74, dribbling: 72, defending: 89, physical: 88, height: 184, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Jules Koundé", team: "Barcelona", league: "La Liga", nation: "France", position: "CB", overall: 89, pace: 81, shooting: 48, passing: 71, dribbling: 74, defending: 88, physical: 83, height: 180, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Marquinhos", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Brazil", position: "CB", overall: 89, pace: 78, shooting: 55, passing: 73, dribbling: 74, defending: 89, physical: 87, height: 183, weight: 79, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Aymeric Laporte", team: "Manchester City", league: "Premier League", nation: "France", position: "CB", overall: 89, pace: 75, shooting: 46, passing: 74, dribbling: 72, defending: 89, physical: 84, height: 189, weight: 81, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Giorgio Chiellini", team: "Los Angeles FC", league: "MLS", nation: "Italy", position: "CB", overall: 87, pace: 70, shooting: 52, passing: 71, dribbling: 68, defending: 88, physical: 85, height: 187, weight: 84, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },

  // Wingers/Attackers - Elite
  { name: "Vinícius Jr", team: "Real Madrid", league: "La Liga", nation: "Brazil", position: "LW", overall: 90, pace: 95, shooting: 83, passing: 79, dribbling: 92, defending: 29, physical: 68, height: 176, weight: 73, preferredFoot: "right", weakFoot: 3, skillMoves: 5 },
  { name: "Jude Bellingham", team: "Real Madrid", league: "La Liga", nation: "England", position: "CM", overall: 90, pace: 79, shooting: 82, passing: 83, dribbling: 86, defending: 77, physical: 84, height: 186, weight: 75, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Rodri", team: "Manchester City", league: "Premier League", nation: "Spain", position: "CDM", overall: 91, pace: 62, shooting: 74, passing: 84, dribbling: 77, defending: 87, physical: 82, height: 191, weight: 82, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Virgil van Dijk", team: "Liverpool", league: "Premier League", nation: "Netherlands", position: "CB", overall: 90, pace: 77, shooting: 60, passing: 72, dribbling: 73, defending: 91, physical: 86, height: 195, weight: 92, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },

  // Additional World Class
  { name: "Robert Lewandowski", team: "Barcelona", league: "La Liga", nation: "Poland", position: "ST", overall: 89, pace: 78, shooting: 91, passing: 79, dribbling: 86, defending: 44, physical: 82, height: 185, weight: 81, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Bruno Fernandes", team: "Manchester United", league: "Premier League", nation: "Portugal", position: "CAM", overall: 89, pace: 75, shooting: 85, passing: 89, dribbling: 84, defending: 68, physical: 77, height: 179, weight: 69, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Hernández Simeone", team: "Atlético Madrid", league: "La Liga", nation: "France", position: "CB", overall: 89, pace: 77, shooting: 52, passing: 69, dribbling: 71, defending: 89, physical: 86, height: 189, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Sterling Raheem", team: "Chelsea", league: "Premier League", nation: "England", position: "RW", overall: 88, pace: 89, shooting: 80, passing: 79, dribbling: 87, defending: 36, physical: 70, height: 175, weight: 65, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "João Félix", team: "Barcelona", league: "La Liga", nation: "Portugal", position: "CAM", overall: 88, pace: 82, shooting: 80, passing: 80, dribbling: 88, defending: 42, physical: 71, height: 178, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
];

async function seedElitePlayers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    // Ensure cardQuality is set on all elite players
    const enrichedElite = elitePlayers.map(p => ({
      ...p,
      cardQuality: p.cardQuality || getCardQuality(p.overall),
    }));

    console.log(`⚽ Importing ${enrichedElite.length} ELITE tier players (OVR 89-93)...`);

    const batchSize = 30;
    for (let i = 0; i < enrichedElite.length; i += batchSize) {
      const batch = enrichedElite.slice(i, i + batchSize);
      await db.insert(players).values(batch);
      console.log(`  ${Math.min(i + batchSize, enrichedElite.length)}/${enrichedElite.length} inserted`);
    }

    // Stats
    const [eliteStats] = await connection.query(`
      SELECT
        position,
        COUNT(*) as count,
        MIN(overall) as minOvr,
        MAX(overall) as maxOvr
      FROM players
      WHERE cardQuality = 'elite'
      GROUP BY position
      ORDER BY count DESC
    `);

    console.log("\n✅ Elite players imported!");
    console.log(`\n📊 Elite Players by Position:`);
    console.table(eliteStats);

    // Overall count
    const [totalStats] = await connection.query(`
      SELECT cardQuality, COUNT(*) as count FROM players GROUP BY cardQuality ORDER BY FIELD(cardQuality, 'bronze', 'silver', 'gold', 'elite')
    `);

    console.log("\n📊 Total Card Distribution:");
    console.table(totalStats);

    await connection.end();
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seedElitePlayers();
