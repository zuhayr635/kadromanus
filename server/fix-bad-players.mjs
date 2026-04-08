import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { players } from '../drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

function getCardQuality(overall) {
  if (overall >= 89) return "elite";
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Real replacements with correct name formats
const replacements = {
  "Hernández Simeone": { name: "Nahuel Molina", team: "Atlético Madrid", league: "La Liga", nation: "Argentina", position: "RB", overall: 82, pace: 88, shooting: 62, passing: 72, dribbling: 76, defending: 76, physical: 72, height: 178, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  "Ivory Coast": { name: "Simon Adingra", team: "Brighton", league: "Premier League", nation: "Ivory Coast", position: "LW", overall: 76, pace: 90, shooting: 72, passing: 74, dribbling: 82, defending: 36, physical: 64, height: 176, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  "Sterling Raheem": { name: "Raheem Sterling", team: "Arsenal", league: "Premier League", nation: "England", position: "LW", overall: 82, pace: 88, shooting: 76, passing: 76, dribbling: 86, defending: 42, physical: 68, height: 170, weight: 69, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  "Muslera Fernando": { name: "Fernando Muslera", team: "Galatasaray", league: "Süper Lig", nation: "Uruguay", position: "GK", overall: 82, diving: 80, handling: 82, kicking: 78, positioningGk: 83, reflexes: 84, pace: 48, physical: 76, height: 190, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  "Simons Ousmane": { name: "Xavi Simons", team: "RB Leipzig", league: "Bundesliga", nation: "Netherlands", position: "CAM", overall: 82, pace: 84, shooting: 76, passing: 80, dribbling: 86, defending: 44, physical: 66, height: 178, weight: 68, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  "Vinícius José": { name: "Vinícius Júnior", team: "Real Madrid", league: "La Liga", nation: "Brazil", position: "LW", overall: 92, pace: 95, shooting: 86, passing: 78, dribbling: 92, defending: 32, physical: 68, height: 176, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  "Vinícius López": { name: "Fran García", team: "Real Madrid", league: "La Liga", nation: "Spain", position: "LB", overall: 78, pace: 92, shooting: 58, passing: 72, dribbling: 78, defending: 74, physical: 70, height: 176, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  "Bruno Gonzales": { name: "Bruno Lourenço", team: "Braga", league: "Liga Portugal", nation: "Portugal", position: "CAM", overall: 72, pace: 76, shooting: 70, passing: 76, dribbling: 80, defending: 40, physical: 64, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  "Fabio Paratici": { name: "Fabián Ruiz", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Spain", position: "CM", overall: 82, pace: 72, shooting: 74, passing: 82, dribbling: 82, defending: 72, physical: 74, height: 188, weight: 80, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  "Noel Whelan": { name: "Nicolás Pareja", team: "Casa Pia", league: "Liga Portugal", nation: "Argentina", position: "CB", overall: 70, pace: 64, shooting: 42, passing: 60, dribbling: 58, defending: 76, physical: 74, height: 184, weight: 80, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  "Batista Mezenga": { name: "Batista Mendy", team: "Trabzonspor", league: "Süper Lig", nation: "France", position: "CDM", overall: 72, pace: 68, shooting: 58, passing: 70, dribbling: 68, defending: 74, physical: 76, height: 186, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  "Chery Chakvetadze": { name: "Otar Kiteishvili", team: "Beşiktaş", league: "Süper Lig", nation: "Georgia", position: "CAM", overall: 72, pace: 72, shooting: 68, passing: 74, dribbling: 78, defending: 40, physical: 64, height: 178, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  "Ricky Puig": { name: "Riqui Puig", team: "LA Galaxy", league: "MLS", nation: "Spain", position: "CM", overall: 72, pace: 70, shooting: 66, passing: 78, dribbling: 84, defending: 54, physical: 60, height: 169, weight: 64, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  "Boubcar Kamara": { name: "Boubacar Kamara", team: "Aston Villa", league: "Premier League", nation: "France", position: "CDM", overall: 78, pace: 72, shooting: 62, passing: 78, dribbling: 76, defending: 78, physical: 74, height: 184, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  "Karim Abed": { name: "Karim Rekik", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "CB", overall: 72, pace: 72, shooting: 40, passing: 64, dribbling: 62, defending: 76, physical: 76, height: 185, weight: 80, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  "Liam van Gelderen": { name: "Lutsharel Geertruida", team: "Feyenoord", league: "Eredivisie", nation: "Netherlands", position: "RB", overall: 76, pace: 82, shooting: 60, passing: 70, dribbling: 74, defending: 76, physical: 72, height: 185, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  "Arne Slot": { name: "Sébastien Haller", team: "Liverpool", league: "Premier League", nation: "Ivory Coast", position: "ST", overall: 76, pace: 78, shooting: 80, passing: 68, dribbling: 76, defending: 40, physical: 80, height: 190, weight: 86, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  "Sérgio Conceição": { name: "Sérgio Oliveira", team: "Porto", league: "Liga Portugal", nation: "Portugal", position: "CM", overall: 76, pace: 64, shooting: 72, passing: 80, dribbling: 76, defending: 72, physical: 76, height: 181, weight: 76, preferredFoot: "left", weakFoot: 4, skillMoves: 3 },
  "Lucas Olazábal": { name: "Nico Williams", team: "Athletic Bilbao", league: "La Liga", nation: "Spain", position: "LW", overall: 82, pace: 92, shooting: 74, passing: 76, dribbling: 88, defending: 38, physical: 68, height: 181, weight: 72, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  "Ronny Fernández": { name: "Rony Lopes", team: "Vitória SC", league: "Liga Portugal", nation: "Portugal", position: "RW", overall: 72, pace: 84, shooting: 72, passing: 68, dribbling: 78, defending: 34, physical: 62, height: 174, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  "Marco Rui Costa": { name: "Rui Costa", team: "Fiorentina", league: "Serie A", nation: "Portugal", position: "CM", overall: 76, pace: 68, shooting: 74, passing: 82, dribbling: 80, defending: 68, physical: 72, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  "Andriy Shevchenko": { name: "Florian Wirtz", team: "Bayer Leverkusen", league: "Bundesliga", nation: "Germany", position: "CAM", overall: 89, pace: 82, shooting: 82, passing: 86, dribbling: 90, defending: 42, physical: 62, height: 176, weight: 68, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  "Giorgio Chiellini": { name: "Alessandro Buongiorno", team: "Napoli", league: "Serie A", nation: "Italy", position: "CB", overall: 82, pace: 72, shooting: 42, passing: 62, dribbling: 62, defending: 84, physical: 82, height: 189, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  "Daniele De Rossi": { name: "Bryan Cristante", team: "Roma", league: "Serie A", nation: "Italy", position: "CM", overall: 78, pace: 68, shooting: 72, passing: 78, dribbling: 74, defending: 76, physical: 78, height: 186, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
};

async function fixBadNames() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(conn);

  console.log(`🔧 ${Object.keys(replacements).length} sahte/yanlış oyuncu düzeltiliyor...\n`);

  for (const [oldName, data] of Object.entries(replacements)) {
    // Get the existing player ID
    const [existing] = await conn.query("SELECT id FROM players WHERE name = ?", [oldName]);

    if (existing.length === 0) {
      console.log(`  ⚠️ Bulunamadı: ${oldName}`);
      continue;
    }

    const id = existing[0].id;

    // Try to fetch photo for the new real player
    let faceImageUrl = null;
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(data.name + ' footballer')}&format=json&origin=*`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const d = await res.json();
        if (d.query?.search?.length) {
          const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(d.query.search[0].title)}&prop=pageimages&format=json&origin=*`;
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            const pages = imgData.query?.pages;
            if (pages) {
              const page = Object.values(pages)[0];
              if (page?.thumbnail?.source) {
                faceImageUrl = page.thumbnail.source.replace(/\/\d+px-/, '/300px-');
              }
            }
          }
        }
      }
    } catch (e) { /* skip photo */ }

    const update = { ...data, cardQuality: getCardQuality(data.overall), faceImageUrl };

    await conn.query("UPDATE players SET name = ?, team = ?, league = ?, nation = ?, position = ?, overall = ?, cardQuality = ?, faceImageUrl = ?, pace = ?, shooting = ?, passing = ?, dribbling = ?, defending = ?, physical = ?, height = ?, weight = ?, preferredFoot = ?, weakFoot = ?, skillMoves = ? WHERE id = ?",
      [update.name, update.team, update.league, update.nation, update.position, update.overall, update.cardQuality, update.faceImageUrl,
       update.pace, update.shooting, update.passing, update.dribbling, update.defending, update.physical, update.height, update.weight, update.preferredFoot, update.weakFoot, update.skillMoves, id]);

    console.log(`  ✅ ${oldName} → ${data.name} (${data.overall} ${update.cardQuality}) ${faceImageUrl ? '📷' : '❌ no photo'}`);
    await delay(300);
  }

  // Final check
  const [stats] = await conn.query("SELECT COUNT(*) as total, SUM(CASE WHEN faceImageUrl IS NULL OR faceImageUrl = '' THEN 1 ELSE 0 END) as noPhoto FROM players");
  console.log(`\n📊 Final: ${stats[0].total} oyuncu, ${stats[0].noPhoto} fotoğrafsız`);

  await conn.end();
}

fixBadNames();