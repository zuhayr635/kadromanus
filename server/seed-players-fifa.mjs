/**
 * FIFA/EA FC Player Data Import Script
 *
 * DATASET SOURCE: Kaggle - FIFA 25 / EA FC 25 Complete Player Dataset
 * Search: "male_players (legacy).csv" or "players_25.csv"
 *
 * Expected CSV columns (from Kaggle FIFA datasets):
 * - short_name, long_name
 * - club_name, league_name, nationality_name
 * - overall, potential
 * - age, height_cm, weight_kg
 * - club_position, nation_position
 * - preferred_foot (Left/Right)
 * - weak_foot, skill_moves (1-5)
 * - pace, shooting, passing, dribbling, defending, physic
 * - goalkeeping_speed, diving, handling, kicking, positioning, reflexes
 * - player_face_url, player_url
 *
 * INSTALL REQUIRED:
 * pnpm add csv-parser
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { players } from "../drizzle/schema.ts";
import dotenv from "dotenv";
import fs from "fs";
import csvParser from "csv-parser";

dotenv.config();

// Card quality tiers based on overall rating
function getCardQuality(overall) {
  if (overall >= 89) return "elite";
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

// Parse position from FIFA data
function parsePosition(position) {
  if (!position || position === "0" || position === "") return "SUB";

  // FIFA position codes to our format
  const positionMap = {
    "GK": "GK",
    "CB": "CB", "LCB": "CB", "RCB": "CB", "LB": "LB", "RB": "RB",
    "LWB": "LWB", "RWB": "RWB",
    "CDM": "CDM", "LDM": "CDM", "RDM": "CDM",
    "CM": "CM", "LCM": "CM", "RCM": "CM",
    "CAM": "CAM", "LAM": "CAM", "RAM": "CAM",
    "LM": "LM", "RM": "RM",
    "LW": "LW", "RW": "RW", "LF": "LW", "RF": "RW",
    "ST": "ST", "CF": "ST", "LS": "ST", "RS": "ST",
  };

  return positionMap[position.toUpperCase()] || position.toUpperCase();
}

// Calculate card quality color based on position
function isGoalkeeper(position) {
  const pos = (position || "").toUpperCase();
  return pos === "GK" || pos === "GOALKEEPER";
}

/**
 * Parse FIFA CSV row to our player format
 */
function parseFifaPlayer(row) {
  // Handle different FIFA dataset formats
  const name = row.short_name || row.long_name || row.Name || row.player_name || "Unknown";
  const team = row.club_name || row.Club || row.club || "Free Agent";
  const league = row.league_name || row.League || row.league || "";
  const nation = row.nationality_name || row.Nationality || row.nationality || "";
  const position = parsePosition(row.club_position || row.Position || row.position || "ST");
  const overall = parseInt(row.overall || row.Overall || row.OVR || 70);
  const preferredFoot = (row.preferred_foot || row.Preferred_Foot || "right")?.toLowerCase() || "right";

  // Field player stats
  const pace = parseInt(row.pace || row.Pace || row.PAC || 0);
  const shooting = parseInt(row.shooting || row.Shooting || row.SHO || 0);
  const passing = parseInt(row.passing || row.Passing || row.PAS || 0);
  const dribbling = parseInt(row.dribbling || row.Dribbling || row.DRI || 0);
  const defending = parseInt(row.defending || row.Defending || row.DEF || 0);
  const physical = parseInt(row.physic || row.Physicality || row.PHY || row.physical || 0);

  // Goalkeeper stats
  const diving = parseInt(row.diving || row.Divin || 0);
  const handling = parseInt(row.handling || row.Handlin || 0);
  const kicking = parseInt(row.kicking || row.Kickin || 0);
  const positioning = parseInt(row.positioning || row.Position || row.positioning_gk || 0);
  const reflexes = parseInt(row.reflexes || row.Reflex || 0);

  // Meta
  const height = parseInt(row.height_cm || row.Height || row.height || 0);
  const weight = parseInt(row.weight_kg || row.Weight || row.weight || 0);
  const weakFoot = parseInt(row.weak_foot || row.Weak_Foot || 3);
  const skillMoves = parseInt(row.skill_moves || row.Skill_Moves || 3);

  // Images
  const faceImageUrl = row.player_face_url || row.face || row.Player_Face_URL || "";
  let imageUrl = faceImageUrl;

  // Fallback image sources
  if (!imageUrl) {
    // Can use: https://fifadatabase.org/assets/players/{id}.png
    // or: https://cdn.sofifa.net/players/{id:3}/{id:2}/{id}.png
    imageUrl = "";
  }

  // Market value (in EUR)
  let marketValue = 0;
  if (row.value_eur || row.Value) {
    const valueStr = String(row.value_eur || row.Value || "");
    // Parse "€50M" or "€500K" format
    const match = valueStr.match(/€?([\d.]+)([MK])?/i);
    if (match) {
      marketValue = parseInt(parseFloat(match[1]) * (match[2]?.toUpperCase() === "M" ? 1000 : 1));
    }
  }

  return {
    name,
    team,
    league,
    nation,
    position,
    overall,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical,
    diving,
    handling,
    kicking,
    positioning,
    reflexes,
    height,
    weight,
    preferredFoot,
    weakFoot,
    skillMoves,
    marketValue,
    imageUrl,
    faceImageUrl,
    cardQuality: getCardQuality(overall),
  };
}

/**
 * Load and parse FIFA CSV file
 */
async function loadFifaCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csvParser({}))
      .on("data", (row) => {
        try {
          const player = parseFifaPlayer(row);
          // Filter out invalid players
          if (player.name && player.name !== "Unknown" && player.overall > 0) {
            results.push(player);
          }
        } catch (err) {
          // Skip invalid rows
        }
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

/**
 * Seed players to database
 */
async function seedFifaPlayers(csvFilePath, options = {}) {
  const {
    limit = null,
    minOverall = 60,
    leagues = null, // Array of league names to filter (e.g., ["Süper Lig", "Premier League"])
    positions = null, // Array of positions to include
  } = options;

  try {
    console.log("📁 CSV dosyası okunuyor:", csvFilePath);
    const fifaPlayers = await loadFifaCSV(csvFilePath);

    console.log(`✅ ${fifaPlayers.length} oyuncu yüklendi`);

    // Apply filters
    let filteredPlayers = fifaPlayers.filter((p) => p.overall >= minOverall);

    if (leagues && leagues.length > 0) {
      filteredPlayers = filteredPlayers.filter((p) =>
        leagues.some((l) => p.league?.toLowerCase().includes(l.toLowerCase()))
      );
    }

    if (positions && positions.length > 0) {
      filteredPlayers = filteredPlayers.filter((p) =>
        positions.some((pos) => p.position?.includes(pos))
      );
    }

    if (limit) {
      filteredPlayers = filteredPlayers.slice(0, limit);
    }

    console.log(`🔁 Filtreleme sonrası: ${filteredPlayers.length} oyuncu`);

    // Database connection
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    // Clear existing players (optional - comment out if you want to keep existing)
    console.log("🗑️ Mevcut oyuncular temizleniyor...");
    await db.delete(players);

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < filteredPlayers.length; i += batchSize) {
      const batch = filteredPlayers.slice(i, i + batchSize);
      await db.insert(players).values(batch);
      inserted += batch.length;
      console.log(`⚽ ${inserted}/${filteredPlayers.length} oyuncu eklendi`);
    }

    console.log("✅ FIFA oyuncu veritabanı başarıyla oluşturuldu!");

    // Stats
    const stats = {
      total: filteredPlayers.length,
      elite: filteredPlayers.filter((p) => p.cardQuality === "elite").length,
      gold: filteredPlayers.filter((p) => p.cardQuality === "gold").length,
      silver: filteredPlayers.filter((p) => p.cardQuality === "silver").length,
      bronze: filteredPlayers.filter((p) => p.cardQuality === "bronze").length,
      goalkeepers: filteredPlayers.filter((p) => p.position === "GK").length,
    };
    console.log("📊 İstatistikler:", stats);

    await connection.end();
  } catch (error) {
    console.error("❌ Seed hatası:", error);
    process.exit(1);
  }
}

// CLI usage
const args = process.argv.slice(2);
const csvPath = args[0];

if (!csvPath) {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  FIFA/EA FC Player Data Import Script                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  KULLANIM:                                                    ║
║    npx tsx server/seed-players-fifa.mjs <csv-dosya-yolu>      ║
║                                                               ║
║  ÖRNEKLER:                                                    ║
║    # Tüm oyuncuları import et                                 ║
║    npx tsx server/seed-players-fifa.mjs fifa-players.csv      ║
║                                                               ║
║  DATASET KAYNAKLARI:                                          ║
║    1. Kaggle: "FIFA 25 complete player dataset"              ║
║    2. Kaggle: "EA Sports FC 25 players dataset"              ║
║    3. GitHub: Search "fifa-player-data"                      ║
║                                                               ║
║  ÖNERILEN KAGGLE DATASET:                                    ║
║    - males_players.csv (latest FIFA/FC dataset)               ║
║    - players_25.csv                                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

// Run with options
seedFifaPlayers(csvPath, {
  minOverall: 60, // Minimum overall rating
  // leagues: ["Süper Lig", "Premier League", "La Liga"], // Optional: filter by league
  // limit: 1000, // Optional: limit number of players
});
