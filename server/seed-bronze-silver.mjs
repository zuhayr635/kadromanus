/**
 * BRONZE & SILVER REAL PLAYERS
 * Lower-rated real players to balance the card distribution
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

const lowerRatedPlayers = [
  // BRONZE TIER (50-64) - Real young prospects & squad players

  // Premier League squad players
  { name: "Kobbie Mainoo", team: "Manchester United", league: "Premier League", nation: "England", position: "CM", overall: 64, pace: 68, shooting: 55, passing: 70, dribbling: 75, defending: 65, physical: 62, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Ethan Laird", team: "Bournemouth", league: "Premier League", nation: "England", position: "RB", overall: 62, pace: 78, shooting: 45, passing: 58, dribbling: 64, defending: 60, physical: 65, height: 176, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Joe Hugill", team: "Manchester United", league: "Premier League", nation: "England", position: "ST", overall: 58, pace: 62, shooting: 58, passing: 48, dribbling: 55, defending: 28, physical: 58, height: 188, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Charlie Savage", team: "Reading", league: "EFL League One", nation: "Wales", position: "CM", overall: 60, pace: 58, shooting: 52, passing: 65, dribbling: 62, defending: 58, physical: 55, height: 178, weight: 70, preferredFoot: "left", weakFoot: 2, skillMoves: 3 },

  // Turkish Super League young players
  { name: "Ahmetcan Kaplan", team: "Galatasaray", league: "Süper Lig", nation: "Turkey", position: "CB", overall: 64, pace: 62, shooting: 35, passing: 52, dribbling: 54, defending: 68, physical: 66, height: 186, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Yunus Akgün", team: "Galatasaray", league: "Süper Lig", nation: "Turkey", position: "RW", overall: 65, pace: 82, shooting: 62, passing: 63, dribbling: 70, defending: 32, physical: 58, height: 177, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Barış Alper Yılmaz", team: "Galatasaray", league: "Süper Lig", nation: "Turkey", position: "RW", overall: 65, pace: 84, shooting: 60, passing: 62, dribbling: 68, defending: 30, physical: 62, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Szymon Żurkowski", team: "Fenerbahçe", league: "Süper Lig", nation: "Poland", position: "CM", overall: 63, pace: 68, shooting: 58, passing: 64, dribbling: 66, defending: 62, physical: 65, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Mert Hakan Yandaş", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "CM", overall: 64, pace: 62, shooting: 60, passing: 68, dribbling: 68, defending: 64, physical: 68, height: 182, weight: 76, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "İbrahim Tatlıses", team: "Çaykur Rizespor", league: "Süper Lig", nation: "Turkey", position: "CAM", overall: 62, pace: 65, shooting: 58, passing: 64, dribbling: 66, defending: 40, physical: 55, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Salih Dursun", team: "Sivasspor", league: "Süper Lig", nation: "Turkey", position: "RB", overall: 61, pace: 70, shooting: 42, passing: 55, dribbling: 58, defending: 62, physical: 64, height: 178, weight: 72, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Fahri Taha", team: "Kasımpaşa", league: "Süper Lig", nation: "Turkey", position: "ST", overall: 60, pace: 72, shooting: 58, passing: 48, dribbling: 58, defending: 30, physical: 62, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Rahmetullah Berişbek", team: "Antalyaspor", league: "Süper Lig", nation: "Turkey", position: "LB", overall: 59, pace: 68, shooting: 40, passing: 52, dribbling: 56, defending: 58, physical: 60, height: 175, weight: 68, preferredFoot: "left", weakFoot: 2, skillMoves: 2 },

  // Bundesliga youth players
  { name: "Youssoufa Moukoko", team: "Borussia Dortmund", league: "Bundesliga", nation: "Germany", position: "ST", overall: 64, pace: 78, shooting: 62, passing: 52, dribbling: 66, defending: 28, physical: 58, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Tom Bischof", team: "TSG Hoffenheim", league: "Bundesliga", nation: "Germany", position: "CM", overall: 63, pace: 62, shooting: 54, passing: 68, dribbling: 68, defending: 60, physical: 60, height: 180, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Assan Ouédraogo", team: "RB Leipzig", league: "Bundesliga", nation: "Germany", position: "CM", overall: 62, pace: 65, shooting: 52, passing: 64, dribbling: 66, defending: 58, physical: 58, height: 178, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Paul Wanner", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "CAM", overall: 61, pace: 64, shooting: 54, passing: 62, dribbling: 68, defending: 38, physical: 52, height: 182, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Arijon Ibrahimović", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "CM", overall: 58, pace: 60, shooting: 48, passing: 58, dribbling: 62, defending: 42, physical: 48, height: 175, weight: 66, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Nelson Weiper", team: "Mainz 05", league: "Bundesliga", nation: "Germany", position: "ST", overall: 60, pace: 58, shooting: 62, passing: 50, dribbling: 54, defending: 32, physical: 64, height: 188, weight: 82, preferredFoot: "right", weakFoot: 4, skillMoves: 2 },

  // La Liga canteranos
  { name: "Lamine Yamal", team: "Barcelona", league: "La Liga", nation: "Spain", position: "RW", overall: 64, pace: 82, shooting: 58, passing: 62, dribbling: 78, defending: 30, physical: 52, height: 175, weight: 65, preferredFoot: "left", weakFoot: 4, skillMoves: 5 },
  { name: "Pau Cubarsí", team: "Barcelona", league: "La Liga", nation: "Spain", position: "CB", overall: 65, pace: 62, shooting: 32, passing: 60, dribbling: 66, defending: 72, physical: 62, height: 184, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Álex Baena", team: "Villarreal", league: "La Liga", nation: "Spain", position: "LW", overall: 63, pace: 76, shooting: 60, passing: 64, dribbling: 72, defending: 38, physical: 56, height: 178, weight: 68, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Nico Williams", team: "Athletic Bilbao", league: "La Liga", nation: "Spain", position: "RW", overall: 64, pace: 88, shooting: 58, passing: 62, dribbling: 74, defending: 34, physical: 58, height: 180, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Gavi", team: "Barcelona", league: "La Liga", nation: "Spain", position: "CM", overall: 64, pace: 72, shooting: 57, passing: 72, dribbling: 80, defense: 65, physical: 66, height: 173, weight: 69, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Fermin López", team: "Barcelona", league: "La Liga", nation: "Spain", position: "CM", overall: 62, pace: 70, shooting: 54, passing: 66, dribbling: 72, defending: 54, physical: 58, height: 178, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Juan Miranda", team: "Real Betis", league: "La Liga", nation: "Spain", position: "LB", overall: 63, pace: 72, shooting: 48, passing: 62, dribbling: 68, defending: 68, physical: 64, height: 180, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Álvaro Negredo", team: "Cádiz", league: "La Liga", nation: "Spain", position: "ST", overall: 61, pace: 54, shooting: 68, passing: 52, dribbling: 58, defending: 38, physical: 76, height: 186, weight: 86, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },

  // Serie A squad players
  { name: "Francesco Pio Esposito", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "ST", overall: 60, pace: 66, shooting: 56, passing: 50, dribbling: 58, defending: 30, physical: 58, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Samuele Mulattieri", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "ST", overall: 59, pace: 64, shooting: 54, passing: 48, dribbling: 54, defending: 28, physical: 60, height: 184, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Tommaso Milanese", team: "Juventus", league: "Serie A", nation: "Italy", position: "CM", overall: 58, pace: 56, shooting: 48, passing: 60, dribbling: 62, defending: 54, physical: 54, height: 178, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Nicolo Savona", team: "Juventus", league: "Serie A", nation: "Italy", position: "RB", overall: 57, pace: 68, shooting: 40, passing: 52, dribbling: 56, defending: 56, physical: 58, height: 175, weight: 68, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Matías Soulé", team: "Juventus", league: "Serie A", nation: "Argentina", position: "LW", overall: 62, pace: 80, shooting: 56, passing: 54, dribbling: 70, defending: 32, physical: 52, height: 175, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Federico Chiesa", team: "Juventus", league: "Serie A", nation: "Italy", position: "RW", overall: 65, pace: 86, shooting: 64, passing: 66, dribbling: 78, defending: 36, physical: 62, height: 180, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },

  // Ligue 1 young players
  { name: "Warren Zaïre-Emery", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "CDM", overall: 64, pace: 68, shooting: 52, passing: 70, dribbling: 78, defending: 68, physical: 65, height: 176, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Elye Wahi", team: "Lens", league: "Ligue 1", nation: "France", position: "ST", overall: 63, pace: 80, shooting: 62, passing: 50, dribbling: 64, defending: 32, physical: 62, height: 178, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Bradley Barcola", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "LW", overall: 62, pace: 84, shooting: 54, passing: 56, dribbling: 72, defending: 28, physical: 54, height: 175, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Khephren Thuram", team: "Nice", league: "Ligue 1", nation: "France", position: "CM", overall: 65, pace: 78, shooting: 54, passing: 68, dribbling: 74, defending: 64, physical: 66, height: 192, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Manu Koné", team: "Borussia Mönchengladbach", league: "Bundesliga", nation: "France", position: "CDM", overall: 64, pace: 70, shooting: 52, passing: 66, dribbling: 70, defending: 68, physical: 68, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Mathys Tel", team: "Bayern Munich", league: "Bundesliga", nation: "France", position: "ST", overall: 63, pace: 82, shooting: 62, passing: 52, dribbling: 68, defending: 30, physical: 62, height: 182, weight: 76, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },

  // SILVER TIER (65-74) - Real solid players
  { name: "Emile Smith Rowe", team: "Fulham", league: "Premier League", nation: "England", position: "CAM", overall: 74, pace: 76, shooting: 70, passing: 76, dribbling: 79, defending: 48, physical: 62, height: 178, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Harvey Barnes", team: "Newcastle", league: "Premier League", nation: "England", position: "LW", overall: 75, pace: 88, shooting: 76, passing: 70, dribbling: 78, defending: 38, physical: 68, height: 183, weight: 74, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Morgan Rogers", team: "Aston Villa", league: "Premier League", nation: "England", position: "LW", overall: 72, pace: 84, shooting: 68, passing: 66, dribbling: 76, defending: 34, physical: 62, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Cameron Archer", team: "Southampton", league: "Premier League", nation: "England", position: "ST", overall: 71, pace: 82, shooting: 72, passing: 56, dribbling: 70, defending: 32, physical: 64, height: 180, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Eberechi Eze", team: "Crystal Palace", league: "Premier League", nation: "England", position: "CAM", overall: 74, pace: 78, shooting: 76, passing: 78, dribbling: 85, defending: 42, physical: 62, height: 182, weight: 76, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  { name: "Adam Wharton", team: "Crystal Palace", league: "Premier League", nation: "England", position: "CM", overall: 71, pace: 68, shooting: 64, passing: 74, dribbling: 76, defending: 68, physical: 64, height: 182, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Kiernan Dewsbury-Hall", team: "Chelsea", league: "Premier League", nation: "England", position: "CM", overall: 73, pace: 74, shooting: 68, passing: 76, dribbling: 78, defending: 66, physical: 68, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Joe Gomez", team: "Liverpool", league: "Premier League", nation: "England", position: "CB", overall: 72, pace: 72, shooting: 40, passing: 62, dribbling: 66, defending: 80, physical: 76, height: 188, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Conor Gallagher", team: "Atletico Madrid", league: "La Liga", nation: "England", position: "CM", overall: 74, pace: 72, shooting: 66, passing: 74, dribbling: 78, defending: 76, physical: 78, height: 182, weight: 74, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Marc Guéhi", team: "Crystal Palace", league: "Premier League", nation: "England", position: "CB", overall: 73, pace: 74, shooting: 44, passing: 64, dribbling: 68, defending: 80, physical: 75, height: 184, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Eddie Nketiah", team: "Crystal Palace", league: "Premier League", nation: "England", position: "ST", overall: 74, pace: 82, shooting: 78, passing: 62, dribbling: 74, defending: 36, physical: 68, height: 175, weight: 71, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Emile Höjbjerg", team: "Tottenham", league: "Premier League", nation: "Denmark", position: "CDM", overall: 73, pace: 60, shooting: 68, passing: 76, dribbling: 74, defending: 78, physical: 80, height: 186, weight: 82, preferredFoot: "right", weakFoot: 4, skillMoves: 2 },
  { name: "Pierre-Emile Højbjerg", team: "Tottenham", league: "Premier League", nation: "Denmark", position: "CDM", overall: 73, pace: 58, shooting: 68, passing: 76, dribbling: 72, defending: 78, physical: 82, height: 186, weight: 84, preferredFoot: "right", weakFoot: 4, skillMoves: 2 },
  { name: "Ryan Sessegnon", team: "Tottenham", league: "Premier League", nation: "England", position: "LB", overall: 70, pace: 82, shooting: 58, passing: 66, dribbling: 74, defending: 68, physical: 64, height: 178, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Tariq Lamptey", team: "Brighton", league: "Premier League", nation: "England", position: "RB", overall: 71, pace: 88, shooting: 58, passing: 66, dribbling: 72, defending: 68, physical: 62, height: 174, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // Turkish silver players
  { name: "Cenk Tosun", team: "Beşiktaş", league: "Süper Lig", nation: "Turkey", position: "ST", overall: 74, pace: 68, shooting: 76, passing: 62, dribbling: 68, defending: 36, physical: 78, height: 186, weight: 80, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Orkun Kökçü", team: "Benfica", league: "Liga Portugal", nation: "Turkey", position: "CDM", overall: 74, pace: 64, shooting: 64, passing: 78, dribbling: 76, defending: 76, physical: 72, height: 182, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Mert Müldür", team: "Sassuolo", league: "Serie A", nation: "Turkey", position: "RB", overall: 70, pace: 76, shooting: 52, passing: 62, dribbling: 64, defending: 70, physical: 68, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Viktor Gyökeres", team: "Sporting CP", league: "Liga Portugal", nation: "Sweden", position: "ST", overall: 74, pace: 80, shooting: 76, passing: 62, dribbling: 70, defending: 38, physical: 78, height: 186, weight: 82, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "João Neves", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "CDM", overall: 73, pace: 68, shooting: 54, passing: 76, dribbling: 78, defending: 76, physical: 68, height: 176, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Antonio Silva", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "CB", overall: 73, pace: 70, shooting: 42, passing: 62, dribbling: 66, defending: 80, physical: 74, height: 186, weight: 78, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Geovany Quenda", team: "Sporting CP", league: "Liga Portugal", nation: "Portugal", position: "RW", overall: 66, pace: 90, shooting: 58, passing: 58, dribbling: 70, defending: 32, physical: 52, height: 174, weight: 65, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Mateus Fernandes", team: "Southampton", league: "Premier League", nation: "Portugal", position: "CM", overall: 69, pace: 66, shooting: 58, passing: 72, dribbling: 74, defending: 68, physical: 66, height: 178, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "João Pedro", team: "Brighton", league: "Premier League", nation: "Brazil", position: "ST", overall: 74, pace: 76, shooting: 76, passing: 66, dribbling: 72, defending: 42, physical: 74, height: 184, weight: 78, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Carlos Vinícius", team: "Fulham", league: "Premier League", nation: "Brazil", position: "ST", overall: 72, pace: 70, shooting: 74, passing: 60, dribbling: 68, defending: 38, physical: 78, height: 190, weight: 84, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },

  // Goalkeepers - Bronze/Silver
  { name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Italy", position: "GK", overall: 74, diving: 75, handling: 72, kicking: 68, positioningGk: 76, reflexes: 74, pace: 45, physical: 72, height: 196, weight: 90, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },
  { name: "Mike Maignan", team: "AC Milan", league: "Serie A", nation: "France", position: "GK", overall: 73, diving: 74, handling: 72, kicking: 66, positioningGk: 75, reflexes: 73, pace: 46, physical: 74, height: 190, weight: 88, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },
  { name: "Diogo Costa", team: "Porto", league: "Liga Portugal", nation: "Portugal", position: "GK", overall: 71, diving: 72, handling: 70, kicking: 64, positioningGk: 72, reflexes: 71, pace: 48, physical: 70, height: 192, weight: 86, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Jose Sá", team: "Wolves", league: "Premier League", nation: "Portugal", position: "GK", overall: 70, diving: 70, handling: 68, kicking: 62, positioningGk: 71, reflexes: 70, pace: 46, physical: 68, height: 192, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Neto", team: "Bournemouth", league: "Premier League", nation: "Portugal", position: "GK", overall: 69, diving: 68, handling: 66, kicking: 60, positioningGk: 70, reflexes: 68, pace: 44, physical: 66, height: 186, weight: 80, preferredFoot: "left", weakFoot: 2, skillMoves: 1 },
  { name: "José Sá", team: "Wolves", league: "Premier League", nation: "Portugal", position: "GK", overall: 68, diving: 67, handling: 65, kicking: 58, positioningGk: 69, reflexes: 67, pace: 44, physical: 64, height: 192, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Alphonse Areola", team: "West Ham", league: "Premier League", nation: "France", position: "GK", overall: 67, diving: 66, handling: 64, kicking: 56, positioningGk: 68, reflexes: 66, pace: 42, physical: 62, height: 196, weight: 90, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Rui Patrício", team: "Roma", league: "Serie A", nation: "Portugal", position: "GK", overall: 66, diving: 65, handling: 63, kicking: 54, positioningGk: 67, reflexes: 65, pace: 40, physical: 60, height: 190, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
];

async function seedLowerRatedPlayers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    const enriched = lowerRatedPlayers.map(p => ({
      ...p,
      cardQuality: getCardQuality(p.overall),
    }));

    console.log(`⚽ Adding ${enriched.length} bronze & silver REAL players...`);

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

seedLowerRatedPlayers();
