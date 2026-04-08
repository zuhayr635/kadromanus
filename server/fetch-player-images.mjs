/**
 * Fetch real player images from TheSportsDB API (free tier)
 * Updates faceImageUrl for players that only have ui-avatars fallback
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const THESPORTSDB_SEARCH = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=";
const THESPORTSDB_IMG_BASE = "https://www.thesportsdb.com";
const FUTWIZ_CDN = "https://cdn.futwiz.com/assets/img/fc25/faces";
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPlayerImages() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Get players with ui-avatars fallback (no real image)
  const [players] = await connection.query(
    "SELECT id, name, team FROM players WHERE faceImageUrl LIKE '%ui-avatars.com%' OR faceImageUrl IS NULL"
  );

  console.log(`📷 ${players.length} oyuncu için gerçek resim aranıyor...\n`);

  let found = 0;
  let notFound = 0;

  for (const p of players) {
    try {
      // Try TheSportsDB API
      const searchName = p.name.replace(/[ćčđšž]/g, m => ({ 'ć': 'c', 'č': 'c', 'đ': 'd', 'š': 's', 'ž': 'z' }[m] || m));
      const res = await fetch(THESPORTSDB_SEARCH + encodeURIComponent(searchName));
      if (!res.ok) { notFound++; continue; }

      const data = await res.json();
      const results = data.player;

      if (results && results.length > 0) {
        // Find best match - prefer one with an image and matching team
        let best = null;
        for (const r of results) {
          if (r.strThumb && r.strThumb !== null) {
            best = r;
            if (p.team && r.strTeam && r.strTeam.toLowerCase().includes(p.team.toLowerCase().split(' ')[0].toLowerCase())) {
              break;
            }
          }
        }

        if (best && best.strThumb) {
          const imageUrl = best.strThumb;
          await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
          found++;
          console.log(`  ✅ ${p.name} → TheSportsDB`);
          await delay(300); // Rate limit
          continue;
        }
      }

      notFound++;
      // Keep ui-avatars for these
      await delay(200);
    } catch (err) {
      notFound++;
    }
  }

  console.log(`\n📊 Sonuç:`);
  console.log(`  Gerçek resim bulundu: ${found}`);
  console.log(`  Avatar kaldı: ${notFound}`);
  console.log(`  Toplam işlendi: ${players.length}`);

  await connection.end();
}

fetchPlayerImages().catch(console.error);
