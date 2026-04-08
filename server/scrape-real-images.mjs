/**
 * Scrape real player images from multiple sources
 * Uses Sofifa, Transfermarkt, and FotMob
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Sofifa player image URL pattern
function getSofifaImage(playerName) {
  // Sofifa uses player IDs, we can try common patterns
  const cleanName = playerName.toLowerCase().replace(/[^a-z ]/g, '').trim();
  const slug = cleanName.replace(/ /g, '-');
  // Sofifa pattern: https://cdn.sofifa.net/players/{first3}/{first2}/{playerId}.png
  // We don't have IDs, so this won't work directly
  return null;
}

// Try FotMob API (public, no auth needed)
async function searchFotMob(playerName) {
  try {
    const searchUrl = `https://www.fotmob.com/api/searchapi/suggest?term=${encodeURIComponent(playerName)}&lang=en`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.players && data.players.length > 0) {
      const player = data.players[0];
      if (player.imageUrl) {
        return player.imageUrl.replace(/\/\d+\//, '/200/'); // Higher res
      }
    }
  } catch (err) {
    console.error(`FotMob error for ${playerName}:`, err.message);
  }
  return null;
}

// Try API-Football (free tier)
async function searchApiFootball(playerName) {
  // API-Football requires API key, skip for now
  return null;
}

// Try Google Images via SerpAPI (requires API key)
async function searchGoogleImages(playerName) {
  // Would need SerpAPI key, skip
  return null;
}

// Backup: Generate realistic football player avatars using RoboHash
function getRoboHashAvatar(playerName, cardQuality) {
  const colors = {
    bronze: 'set1',
    silver: 'set2',
    gold: 'set3',
    elite: 'set4',
  };
  const set = colors[cardQuality] || 'set1';
  return `https://robohash.org/${encodeURIComponent(playerName)}.png?size=200x200&set=${set}`;
}

async function fetchAllImages() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Get players with UI Avatars (generic, not real photos)
  const [players] = await connection.query(
    `SELECT id, name, team, nation, position, cardQuality
     FROM players
     WHERE faceImageUrl LIKE '%ui-avatars%'
     ORDER BY overall DESC
     LIMIT 100`
  );

  console.log(`🔍 ${players.length} oyuncu için gerçek fotoğraf aranıyor...\n`);

  let found = 0;
  let notFound = 0;

  for (const p of players) {
    console.log(`  Arıyor: ${p.name}...`);

    let imageUrl = null;

    // Try FotMob first (best free source)
    imageUrl = await searchFotMob(p.name);
    if (imageUrl) {
      console.log(`    ✅ FotMob: ${p.name}`);
      await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
      found++;
      await delay(800);
      continue;
    }

    // If not found, try with team name
    if (p.team && p.team !== 'Unknown') {
      imageUrl = await searchFotMob(`${p.name} ${p.team}`);
      if (imageUrl) {
        console.log(`    ✅ FotMob (with team): ${p.name}`);
        await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
        found++;
        await delay(800);
        continue;
      }
    }

    console.log(`    ❌ Bulunamadı: ${p.name}`);
    notFound++;
    await delay(500);
  }

  console.log(`\n📊 Sonuç:`);
  console.log(`  FotMob'dan bulundu: ${found}`);
  console.log(`  Bulunamadı: ${notFound}`);

  // Check if we should try more sources or give up
  const [remainingUiAvatars] = await connection.query(
    "SELECT COUNT(*) as cnt FROM players WHERE faceImageUrl LIKE '%ui-avatars%'"
  );

  console.log(`\n⚠️ Hala ${remainingUiAvatars[0].cnt} oyuncunun gerçek fotoğrafı yok.`);
  console.log(`\nSeçenekler:`);
  console.log(`1. Kalan oyuncular için FotMob aramaya devam et (yavaş)`);
  console.log(`2. Transfermarkt scrape et (yasal gri alan)`);
  console.log(`3. Generic fotoğraflı oyuncu placeholder'ları kullan`);

  await connection.end();
}

fetchAllImages().catch(console.error);
