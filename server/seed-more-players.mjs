/**
 * ADDITIONAL REAL PLAYERS
 * More players from major leagues to expand the database
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { players } from "../drizzle/schema.ts";
import dotenv from "dotenv";

dotenv.config();

function getCardQuality(overall) {
  if (overall >= 89) return "elite";
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

const additionalPlayers = [
  // More Premier League
  { name: "Marcus Rashford", team: "Manchester United", league: "Premier League", nation: "England", position: "LW", overall: 84, pace: 89, shooting: 80, passing: 75, dribbling: 82, defending: 35, physical: 75, height: 187, weight: 78, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Bruno Guimarães", team: "Newcastle", league: "Premier League", nation: "Brazil", position: "CM", overall: 85, pace: 74, shooting: 72, passing: 82, dribbling: 81, defending: 76, physical: 80, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Alexander Isak", team: "Newcastle", league: "Premier League", nation: "Sweden", position: "ST", overall: 85, pace: 88, shooting: 83, passing: 71, dribbling: 79, defending: 36, physical: 78, height: 192, weight: 80, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Cole Palmer", team: "Chelsea", league: "Premier League", nation: "England", position: "CAM", overall: 84, pace: 76, shooting: 82, passing: 80, dribbling: 85, defending: 38, physical: 68, height: 182, weight: 74, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Ollie Watkins", team: "Aston Villa", league: "Premier League", nation: "England", position: "ST", overall: 83, pace: 85, shooting: 82, passing: 73, dribbling: 78, defending: 40, physical: 77, height: 186, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Jarrod Bowen", team: "West Ham", league: "Premier League", nation: "England", position: "RW", overall: 82, pace: 87, shooting: 79, passing: 73, dribbling: 81, defending: 42, physical: 74, height: 175, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "James Maddison", team: "Tottenham", league: "Premier League", nation: "England", position: "CAM", overall: 83, pace: 68, shooting: 79, passing: 85, dribbling: 84, defending: 41, physical: 64, height: 175, weight: 71, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Son Heung-min", team: "Tottenham", league: "Premier League", nation: "South Korea", position: "LW", overall: 87, pace: 86, shooting: 87, passing: 78, dribbling: 85, defending: 38, physical: 70, height: 183, weight: 77, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Dominic Solanke", team: "Tottenham", league: "Premier League", nation: "England", position: "ST", overall: 81, pace: 78, shooting: 79, passing: 70, dribbling: 77, defending: 39, physical: 79, height: 187, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Eddie Nketiah", team: "Crystal Palace", league: "Premier League", nation: "England", position: "ST", overall: 79, pace: 82, shooting: 78, passing: 68, dribbling: 76, defending: 37, physical: 71, height: 175, weight: 71, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // More La Liga
  { name: "Antoine Griezmann", team: "Atletico Madrid", league: "La Liga", nation: "France", position: "CAM", overall: 86, pace: 74, shooting: 82, passing: 85, dribbling: 86, defending: 50, physical: 72, height: 176, weight: 73, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "João Félix", team: "Barcelona", league: "La Liga", nation: "Portugal", position: "CF", overall: 85, pace: 80, shooting: 79, passing: 82, dribbling: 88, defending: 38, physical: 68, height: 181, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  { name: "Rodrygo", team: "Real Madrid", league: "La Liga", nation: "Brazil", position: "RW", overall: 85, pace: 87, shooting: 78, passing: 78, dribbling: 85, defending: 40, physical: 64, height: 174, weight: 64, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Federico Valverde", team: "Real Madrid", league: "La Liga", nation: "Uruguay", position: "CM", overall: 87, pace: 80, shooting: 79, passing: 79, dribbling: 82, defending: 76, physical: 83, height: 182, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Dani Carvajal", team: "Real Madrid", league: "La Liga", nation: "Spain", position: "RB", overall: 85, pace: 72, shooting: 68, passing: 78, dribbling: 76, defending: 82, physical: 76, height: 173, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "David Alaba", team: "Real Madrid", league: "La Liga", nation: "Austria", position: "CB", overall: 85, pace: 75, shooting: 58, passing: 75, dribbling: 78, defending: 85, physical: 78, height: 180, weight: 76, preferredFoot: "left", weakFoot: 4, skillMoves: 3 },
  { name: "Frenkie de Jong", team: "Barcelona", league: "La Liga", nation: "Netherlands", position: "CM", overall: 85, pace: 74, shooting: 68, passing: 84, dribbling: 87, defending: 74, physical: 72, height: 181, weight: 74, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Raphinha", team: "Barcelona", league: "La Liga", nation: "Brazil", position: "RW", overall: 84, pace: 88, shooting: 78, passing: 75, dribbling: 85, defending: 39, physical: 67, height: 176, weight: 68, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  { name: "Jules Koundé", team: "Barcelona", league: "La Liga", nation: "France", position: "RB", overall: 84, pace: 82, shooting: 54, passing: 75, dribbling: 76, defending: 84, physical: 75, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Ronald Araújo", team: "Barcelona", league: "La Liga", nation: "Uruguay", position: "CB", overall: 84, pace: 84, shooting: 46, passing: 68, dribbling: 70, defending: 85, physical: 84, height: 192, weight: 87, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },

  // More Bundesliga
  { name: "Jamal Musiala", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "CAM", overall: 86, pace: 76, shooting: 78, passing: 82, dribbling: 89, defending: 40, physical: 67, height: 183, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Leroy Sané", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "RW", overall: 85, pace: 91, shooting: 79, passing: 75, dribbling: 86, defending: 39, physical: 67, height: 183, weight: 75, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Serge Gnabry", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "RW", overall: 83, pace: 85, shooting: 79, passing: 76, dribbling: 83, defending: 42, physical: 71, height: 175, weight: 75, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Joshua Kimmich", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "CDM", overall: 87, pace: 66, shooting: 71, passing: 88, dribbling: 81, defending: 82, physical: 79, height: 182, weight: 75, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Leon Goretzka", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "CM", overall: 85, pace: 72, shooting: 75, passing: 80, dribbling: 82, defending: 77, physical: 86, height: 189, weight: 82, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Alphonso Davies", team: "Bayern Munich", league: "Bundesliga", nation: "Canada", position: "LB", overall: 83, pace: 95, shooting: 68, passing: 75, dribbling: 84, defending: 74, physical: 72, height: 181, weight: 74, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Kim Min-jae", team: "Bayern Munich", league: "Bundesliga", nation: "South Korea", position: "CB", overall: 86, pace: 83, shooting: 45, passing: 71, dribbling: 71, defending: 88, physical: 85, height: 190, weight: 83, preferredFoot: "right", weakFoot: 4, skillMoves: 2 },
  { name: "Marco Reus", team: "Borussia Dortmund", league: "Bundesliga", nation: "Germany", position: "CAM", overall: 83, pace: 76, shooting: 83, passing: 82, dribbling: 87, defending: 40, physical: 67, height: 180, weight: 75, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Jude Bellingham", team: "Real Madrid", league: "La Liga", nation: "England", position: "CM", overall: 90, pace: 79, shooting: 82, passing: 83, dribbling: 86, defending: 77, physical: 84, height: 186, weight: 75, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Emre Can", team: "Borussia Dortmund", league: "Bundesliga", nation: "Germany", position: "CDM", overall: 82, pace: 68, shooting: 70, passing: 76, dribbling: 78, defending: 82, physical: 84, height: 186, weight: 82, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },

  // More Serie A
  { name: "Lautaro Martínez", team: "Inter Milan", league: "Serie A", nation: "Argentina", position: "ST", overall: 87, pace: 83, shooting: 86, passing: 73, dribbling: 84, defending: 39, physical: 80, height: 174, weight: 72, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Nicolò Barella", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "CM", overall: 86, pace: 77, shooting: 71, passing: 84, dribbling: 84, defending: 79, physical: 77, height: 172, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Hakan Çalhanoğlu", team: "Inter Milan", league: "Serie A", nation: "Turkey", position: "CM", overall: 85, pace: 68, shooting: 79, passing: 87, dribbling: 82, defending: 72, physical: 75, height: 180, weight: 76, preferredFoot: "left", weakFoot: 4, skillMoves: 3 },
  { name: "Federico Dimarco", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "LB", overall: 83, pace: 82, shooting: 69, passing: 79, dribbling: 82, defending: 77, physical: 71, height: 174, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Alessandro Bastoni", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "CB", overall: 84, pace: 72, shooting: 41, passing: 72, dribbling: 76, defending: 86, physical: 79, height: 190, weight: 80, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Paulo Dybala", team: "Roma", league: "Serie A", nation: "Argentina", position: "CAM", overall: 84, pace: 77, shooting: 84, passing: 82, dribbling: 88, defending: 32, physical: 64, height: 177, weight: 68, preferredFoot: "left", weakFoot: 4, skillMoves: 5 },
  { name: "Lorenzo Pellegrini", team: "Roma", league: "Serie A", nation: "Italy", position: "CM", overall: 82, pace: 70, shooting: 75, passing: 84, dribbling: 83, defending: 66, physical: 73, height: 187, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Brekalo", team: "Sassuolo", league: "Serie A", nation: "Croatia", position: "RW", overall: 79, pace: 86, shooting: 72, passing: 74, dribbling: 82, defending: 35, physical: 66, height: 175, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Dušan Vlahović", team: "Juventus", league: "Serie A", nation: "Serbia", position: "ST", overall: 85, pace: 80, shooting: 87, passing: 72, dribbling: 79, defending: 38, physical: 80, height: 185, weight: 80, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Weston McKennie", team: "Juventus", league: "Serie A", nation: "USA", position: "CM", overall: 80, pace: 75, shooting: 70, passing: 76, dribbling: 78, defending: 76, physical: 82, height: 183, weight: 79, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // More Ligue 1
  { name: "Kylian Mbappé", team: "Real Madrid", league: "La Liga", nation: "France", position: "ST", overall: 92, pace: 97, shooting: 89, passing: 82, dribbling: 92, defending: 36, physical: 78, height: 178, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  { name: "Ousmane Dembélé", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "RW", overall: 84, pace: 91, shooting: 73, passing: 76, dribbling: 88, defending: 33, physical: 64, height: 178, weight: 67, preferredFoot: "right", weakFoot: 3, skillMoves: 5 },
  { name: "Randal Kolo Muani", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "ST", overall: 82, pace: 88, shooting: 77, passing: 74, dribbling: 81, defending: 33, physical: 73, height: 187, weight: 76, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Vitinha", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Portugal", position: "CM", overall: 82, pace: 76, shooting: 68, passing: 82, dribbling: 84, defending: 69, physical: 68, height: 172, weight: 62, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Warren Zaïre-Emery", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "CDM", overall: 78, pace: 70, shooting: 62, passing: 78, dribbling: 81, defending: 76, physical: 71, height: 174, weight: 66, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Nuno Mendes", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Portugal", position: "LB", overall: 82, pace: 91, shooting: 62, passing: 75, dribbling: 82, defending: 76, physical: 69, height: 176, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Marquinhos", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Brazil", position: "CB", overall: 85, pace: 78, shooting: 53, passing: 73, dribbling: 75, defending: 87, physical: 83, height: 183, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Lucas Hernandez", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "LB", overall: 84, pace: 82, shooting: 58, passing: 75, dribbling: 74, defending: 84, physical: 81, height: 184, weight: 80, preferredFoot: "left", weakFoot: 4, skillMoves: 3 },
  { name: "Bradley Barcola", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "LW", overall: 79, pace: 89, shooting: 70, passing: 72, dribbling: 82, defending: 30, physical: 62, height: 175, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Italy", position: "GK", overall: 86, diving: 86, handling: 85, kicking: 78, positioningGk: 87, reflexes: 88, pace: 48, physical: 85, height: 196, weight: 90, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },

  // Turkish Super League (more players)
  { name: "Orkun Kökçü", team: "Benfica", league: "Liga Portugal", nation: "Turkey", position: "CM", overall: 81, pace: 68, shooting: 68, passing: 82, dribbling: 80, defending: 76, physical: 74, height: 182, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Arda Güler", team: "Real Madrid", league: "La Liga", nation: "Turkey", position: "CAM", overall: 80, pace: 74, shooting: 75, passing: 81, dribbling: 86, defending: 36, physical: 62, height: 176, weight: 66, preferredFoot: "left", weakFoot: 4, skillMoves: 5 },
  { name: "Kenan Yıldız", team: "Juventus", league: "Serie A", nation: "Turkey", position: "CAM", overall: 76, pace: 73, shooting: 72, passing: 74, dribbling: 80, defending: 34, physical: 66, height: 184, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Cengiz Ünder", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "RW", overall: 81, pace: 88, shooting: 74, passing: 75, dribbling: 82, defending: 35, physical: 68, height: 174, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Ferdi Kadioglu", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "LB", overall: 78, pace: 79, shooting: 57, passing: 72, dribbling: 76, defending: 76, physical: 76, height: 182, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Rodrigo Becão", team: "Fenerbahçe", league: "Süper Lig", nation: "Brazil", position: "CB", overall: 79, pace: 71, shooting: 44, passing: 64, dribbling: 66, defending: 82, physical: 81, height: 188, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Altay Bayındır", team: "Manchester United", league: "Premier League", nation: "Turkey", position: "GK", overall: 77, diving: 77, handling: 75, kicking: 73, positioningGk: 78, reflexes: 77, pace: 49, physical: 74, height: 195, weight: 86, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Zeki Celik", team: "Lille", league: "Ligue 1", nation: "Turkey", position: "RB", overall: 79, pace: 84, shooting: 62, passing: 73, dribbling: 76, defending: 76, physical: 72, height: 176, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Yusuf Yazıcı", team: "Lille", league: "Ligue 1", nation: "Turkey", position: "CAM", overall: 79, pace: 68, shooting: 78, passing: 80, dribbling: 82, defending: 44, physical: 68, height: 183, weight: 75, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Oğuzhan Özyakup", team: "Feyenoord", league: "Eredivisie", nation: "Turkey", position: "CM", overall: 75, pace: 68, shooting: 65, passing: 77, dribbling: 76, defending: 72, physical: 70, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
];

async function seedAdditionalPlayers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    const enriched = additionalPlayers.map(p => ({
      ...p,
      cardQuality: getCardQuality(p.overall),
    }));

    console.log(`⚽ Adding ${enriched.length} additional REAL players...`);

    const batchSize = 50;
    for (let i = 0; i < enriched.length; i += batchSize) {
      const batch = enriched.slice(i, i + batchSize);
      await db.insert(players).values(batch);
      console.log(`  ${Math.min(i + batchSize, enriched.length)}/${enriched.length} inserted`);
    }

    const [stats] = await connection.query(`
      SELECT
        cardQuality,
        COUNT(*) as count,
        MIN(overall) as minOvr,
        MAX(overall) as maxOvr
      FROM players
      GROUP BY cardQuality
      ORDER BY FIELD(cardQuality, 'bronze', 'silver', 'gold', 'elite')
    `);

    console.log("\n✅ Import complete!");
    console.log("\n📊 Updated Card Quality Distribution:");
    console.table(stats);

    await connection.end();
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seedAdditionalPlayers();
