/**
 * GOLD TIER PLAYERS BATCH 2
 * 50 gold tier players (OVR 75-88)
 * Real world-class athletes from major leagues
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

// GOLD TIER PLAYERS (75-88)
const goldPlayers = [
  // Premier League Gold
  { name: "Diogo Jota", team: "Liverpool", league: "Premier League", nation: "Portugal", position: "LW", overall: 86, pace: 81, shooting: 84, passing: 77, dribbling: 83, defending: 35, physical: 74, height: 179, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Mateo Kovačić", team: "Manchester City", league: "Premier League", nation: "Croatia", position: "CM", overall: 86, pace: 76, shooting: 72, passing: 84, dribbling: 85, defending: 70, physical: 76, height: 182, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Youri Tielemans", team: "Aston Villa", league: "Premier League", nation: "Belgium", position: "CM", overall: 84, pace: 74, shooting: 76, passing: 81, dribbling: 82, defending: 72, physical: 76, height: 181, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "James Maddison", team: "Tottenham", league: "Premier League", nation: "England", position: "CAM", overall: 84, pace: 73, shooting: 77, passing: 84, dribbling: 84, defending: 45, physical: 71, height: 184, weight: 75, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Son Heung-min", team: "Tottenham", league: "Premier League", nation: "South Korea", position: "LW", overall: 86, pace: 89, shooting: 84, passing: 75, dribbling: 85, defending: 42, physical: 74, height: 183, weight: 76, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Alexis Mac Allister", team: "Brighton", league: "Premier League", nation: "Argentina", position: "CM", overall: 82, pace: 73, shooting: 75, passing: 81, dribbling: 79, defending: 71, physical: 73, height: 180, weight: 71, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Moisés Caicedo", team: "Chelsea", league: "Premier League", nation: "Ecuador", position: "CDM", overall: 84, pace: 77, shooting: 70, passing: 78, dribbling: 76, defending: 82, physical: 84, height: 188, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Reece James", team: "Chelsea", league: "Premier League", nation: "England", position: "RB", overall: 85, pace: 79, shooting: 71, passing: 76, dribbling: 78, defending: 82, physical: 79, height: 186, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Lisandro Martínez", team: "Manchester United", league: "Premier League", nation: "Argentina", position: "CB", overall: 84, pace: 76, shooting: 45, passing: 73, dribbling: 72, defending: 84, physical: 79, height: 178, weight: 75, preferredFoot: "left", weakFoot: 2, skillMoves: 2 },
  { name: "Alejandro Balde", team: "Barcelona", league: "Premier League", nation: "Spain", position: "LB", overall: 79, pace: 82, shooting: 46, passing: 72, dribbling: 76, defending: 77, physical: 77, height: 179, weight: 72, preferredFoot: "left", weakFoot: 2, skillMoves: 2 },

  // La Liga Gold
  { name: "Alejandro Grimaldo", team: "Real Betis", league: "La Liga", nation: "Spain", position: "LW", overall: 84, pace: 86, shooting: 81, passing: 78, dribbling: 85, defending: 33, physical: 71, height: 175, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Dani Olmo", team: "RB Leipzig", league: "La Liga", nation: "Spain", position: "CAM", overall: 83, pace: 79, shooting: 78, passing: 81, dribbling: 83, defending: 48, physical: 72, height: 179, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Mikel Merino", team: "Real Sociedad", league: "La Liga", nation: "Spain", position: "CM", overall: 83, pace: 76, shooting: 74, passing: 81, dribbling: 78, defending: 79, physical: 81, height: 187, weight: 77, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Álvaro Morata", team: "Atlético Madrid", league: "La Liga", nation: "Spain", position: "ST", overall: 83, pace: 83, shooting: 82, passing: 75, dribbling: 79, defending: 38, physical: 79, height: 189, weight: 80, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Vitão", team: "Braga", league: "La Liga", nation: "Brazil", position: "CB", overall: 81, pace: 75, shooting: 42, passing: 68, dribbling: 70, defending: 81, physical: 82, height: 189, weight: 83, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Nico Williams", team: "Athletic Bilbao", league: "La Liga", nation: "Spain", position: "LW", overall: 82, pace: 86, shooting: 78, passing: 75, dribbling: 84, defending: 35, physical: 71, height: 177, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Gorka Guruzeta", team: "Athletic Bilbao", league: "La Liga", nation: "Spain", position: "ST", overall: 79, pace: 83, shooting: 78, passing: 71, dribbling: 77, defending: 34, physical: 76, height: 181, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Serge Gnabry", team: "Bayern Munich", league: "La Liga", nation: "Germany", position: "RW", overall: 82, pace: 85, shooting: 81, passing: 76, dribbling: 83, defending: 39, physical: 71, height: 175, weight: 67, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Alphonso Davies", team: "Bayern Munich", league: "La Liga", nation: "Canada", position: "LB", overall: 84, pace: 96, shooting: 52, passing: 73, dribbling: 81, defending: 78, physical: 79, height: 188, weight: 79, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Leon Goretzka", team: "Bayern Munich", league: "La Liga", nation: "Germany", position: "CM", overall: 82, pace: 75, shooting: 77, passing: 79, dribbling: 78, defending: 71, physical: 84, height: 189, weight: 85, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // Serie A Gold
  { name: "André Onana", team: "Inter Milan", league: "Serie A", nation: "Cameroon", position: "GK", overall: 85, diving: 84, handling: 82, kicking: 77, positioningGk: 85, reflexes: 87, pace: 52, physical: 86, height: 189, weight: 87, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },
  { name: "Ederson", team: "Manchester City", league: "Serie A", nation: "Brazil", position: "GK", overall: 86, diving: 86, handling: 83, kicking: 88, positioningGk: 87, reflexes: 86, pace: 56, physical: 85, height: 188, weight: 90, preferredFoot: "right", weakFoot: 4, skillMoves: 1 },
  { name: "Marc-André ter Stegen", team: "Barcelona", league: "Serie A", nation: "Germany", position: "GK", overall: 86, diving: 85, handling: 85, kicking: 88, positioningGk: 86, reflexes: 87, pace: 48, physical: 81, height: 187, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },
  { name: "Matteo Gabbia", team: "AC Milan", league: "Serie A", nation: "Italy", position: "CB", overall: 80, pace: 71, shooting: 40, passing: 68, dribbling: 67, defending: 80, physical: 80, height: 190, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Alessandro Bastoni", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "CB", overall: 85, pace: 72, shooting: 48, passing: 75, dribbling: 74, defending: 86, physical: 84, height: 187, weight: 80, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Denzel Dumfries", team: "Inter Milan", league: "Serie A", nation: "Netherlands", position: "RB", overall: 84, pace: 83, shooting: 68, passing: 74, dribbling: 78, defending: 80, physical: 84, height: 188, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Lorenzo Insigne", team: "Toronto FC", league: "Serie A", nation: "Italy", position: "LW", overall: 82, pace: 85, shooting: 79, passing: 78, dribbling: 84, defending: 33, physical: 67, height: 175, weight: 65, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Hirving Lozano", team: "Napoli", league: "Serie A", nation: "Mexico", position: "RW", overall: 82, pace: 88, shooting: 77, passing: 74, dribbling: 82, defending: 31, physical: 70, height: 170, weight: 65, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Sergej Milinković-Savić", team: "Lazio", league: "Serie A", nation: "Serbia", position: "CM", overall: 84, pace: 76, shooting: 80, passing: 80, dribbling: 81, defending: 69, physical: 87, height: 191, weight: 82, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },

  // Bundesliga Gold
  { name: "Sergiño Dest", team: "PSV Eindhoven", league: "Bundesliga", nation: "United States", position: "LB", overall: 79, pace: 88, shooting: 57, passing: 71, dribbling: 79, defending: 73, physical: 73, height: 179, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Morten Hjulmand", team: "Sporting CP", league: "Bundesliga", nation: "Denmark", position: "CDM", overall: 81, pace: 76, shooting: 69, passing: 77, dribbling: 75, defending: 82, physical: 83, height: 185, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Simons Ousmane", team: "Leipzig", league: "Bundesliga", nation: "Germany", position: "LW", overall: 82, pace: 88, shooting: 79, passing: 76, dribbling: 84, defending: 37, physical: 69, height: 178, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Wout Weghorst", team: "Burnley", league: "Bundesliga", nation: "Netherlands", position: "ST", overall: 79, pace: 76, shooting: 78, passing: 72, dribbling: 75, defending: 36, physical: 84, height: 198, weight: 89, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Thomas Partey", team: "Arsenal", league: "Bundesliga", nation: "Ghana", position: "CDM", overall: 83, pace: 78, shooting: 71, passing: 77, dribbling: 77, defending: 83, physical: 86, height: 189, weight: 81, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // Ligue 1 Gold
  { name: "Neymar Jr", team: "Al-Hilal", league: "Ligue 1", nation: "Brazil", position: "LW", overall: 87, pace: 86, shooting: 84, passing: 86, dribbling: 92, defending: 29, physical: 67, height: 175, weight: 68, preferredFoot: "right", weakFoot: 5, skillMoves: 5 },
  { name: "Kylian Mbappé", team: "Real Madrid", league: "Ligue 1", nation: "France", position: "ST", overall: 92, pace: 97, shooting: 89, passing: 82, dribbling: 92, defending: 36, physical: 78, height: 178, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  { name: "Aurélien Tchouaméni", team: "Real Madrid", league: "Ligue 1", nation: "France", position: "CDM", overall: 85, pace: 75, shooting: 73, passing: 78, dribbling: 76, defending: 85, physical: 86, height: 187, weight: 81, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Eduardo Camavinga", team: "Real Madrid", league: "Ligue 1", nation: "France", position: "CM", overall: 84, pace: 78, shooting: 64, passing: 77, dribbling: 80, defending: 79, physical: 75, height: 182, weight: 68, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Vinícius Jr", team: "Real Madrid", league: "Ligue 1", nation: "Brazil", position: "LW", overall: 90, pace: 95, shooting: 83, passing: 79, dribbling: 92, defending: 29, physical: 68, height: 176, weight: 73, preferredFoot: "right", weakFoot: 3, skillMoves: 5 },
  { name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Italy", position: "GK", overall: 87, diving: 86, handling: 84, kicking: 80, positioningGk: 87, reflexes: 88, pace: 55, physical: 87, height: 196, weight: 90, preferredFoot: "right", weakFoot: 4, skillMoves: 1 },
  { name: "Marco Verratti", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Italy", position: "CM", overall: 84, pace: 71, shooting: 66, passing: 88, dribbling: 85, defending: 72, physical: 65, height: 164, weight: 58, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Fabián Ruiz", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Spain", position: "CM", overall: 84, pace: 78, shooting: 75, passing: 82, dribbling: 83, defending: 71, physical: 76, height: 186, weight: 75, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },

  // Turkish Super League Gold
  { name: "Vinícius José", team: "Fenerbahçe", league: "Süper Lig", nation: "Brazil", position: "LW", overall: 82, pace: 90, shooting: 79, passing: 73, dribbling: 86, defending: 28, physical: 68, height: 174, weight: 67, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Serdar Aziz", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "CB", overall: 79, pace: 70, shooting: 41, passing: 66, dribbling: 65, defending: 79, physical: 81, height: 191, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Muslera Fernando", team: "Galatasaray", league: "Süper Lig", nation: "Uruguay", position: "GK", overall: 83, diving: 82, handling: 83, kicking: 73, positioningGk: 82, reflexes: 85, pace: 52, physical: 83, height: 190, weight: 84, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },
  { name: "Berkan Kutlu", team: "Beşiktaş", league: "Süper Lig", nation: "Turkey", position: "CAM", overall: 78, pace: 75, shooting: 74, passing: 78, dribbling: 79, defending: 43, physical: 70, height: 182, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Abdülkadir Ömür", team: "Trabzonspor", league: "Süper Lig", nation: "Turkey", position: "CAM", overall: 77, pace: 76, shooting: 72, passing: 76, dribbling: 79, defending: 42, physical: 69, height: 180, weight: 71, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
];

async function seedGoldPlayers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    // Ensure cardQuality is set on all gold players
    const enrichedGold = goldPlayers.map(p => ({
      ...p,
      cardQuality: p.cardQuality || getCardQuality(p.overall),
    }));

    console.log(`⚽ Importing ${enrichedGold.length} GOLD tier players (OVR 75-88)...`);

    const batchSize = 50;
    for (let i = 0; i < enrichedGold.length; i += batchSize) {
      const batch = enrichedGold.slice(i, i + batchSize);
      await db.insert(players).values(batch);
      console.log(`  ${Math.min(i + batchSize, enrichedGold.length)}/${enrichedGold.length} inserted`);
    }

    // Stats
    const [goldStats] = await connection.query(`
      SELECT
        position,
        COUNT(*) as count,
        MIN(overall) as minOvr,
        MAX(overall) as maxOvr
      FROM players
      WHERE cardQuality = 'gold'
      GROUP BY position
      ORDER BY count DESC
    `);

    console.log("\n✅ Gold players imported!");
    console.log(`\n📊 Gold Players by Position:`);
    console.table(goldStats);

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

seedGoldPlayers();
