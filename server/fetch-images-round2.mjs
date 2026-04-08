/**
 * ROUND 2 - Fetch remaining player images
 * Uses FotMob player detail API for better matching
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchFotMobDetailed(playerName, teamName) {
  try {
    // FotMob search API
    const term = encodeURIComponent(playerName);
    const url = `https://www.fotmob.com/api/searchapi/suggest?term=${term}&lang=en`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data.players && data.players.length > 0) {
      // Try to match by team name
      for (const p of data.players) {
        if (p.imageUrl) {
          // If team info available, try to match
          if (teamName && p.teamName) {
            const teamLower = teamName.toLowerCase();
            const pTeamLower = p.teamName.toLowerCase();
            if (teamLower.includes(pTeamLower.split(' ')[0]) || pTeamLower.includes(teamLower.split(' ')[0])) {
              return p.imageUrl;
            }
          }
          // Otherwise return first result with image
          return p.imageUrl;
        }
      }
    }
  } catch (err) {
    // silent
  }
  return null;
}

async function fetchRemaining() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Get players with placeholder or no images
  const [players] = await connection.query(
    `SELECT id, name, team, overall, cardQuality
     FROM players
     WHERE faceImageUrl IS NULL
        OR faceImageUrl = ''
        OR faceImageUrl LIKE '%ui-avatars%'
     ORDER BY overall DESC`
  );

  console.log(`\n📷 ${players.length} oyuncu için ROUND 2 resim araması...\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    process.stdout.write(`\r  [${i + 1}/${players.length}] ${p.name.padEnd(35)}`);

    let imageUrl = null;

    // Try FotMob with full name
    imageUrl = await fetchFotMobDetailed(p.name, p.team);
    if (imageUrl) {
      await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
      found++;
      await delay(500);
      continue;
    }

    // Try with simplified name (remove special chars)
    const simpleName = p.name
      .replace(/[čćđšžğıüö]/gi, m => ({ 'č': 'c', 'ć': 'c', 'đ': 'd', 'š': 's', 'ž': 'z', 'ğ': 'g', 'ı': 'i', 'ü': 'u', 'ö': 'o' }[m.toLowerCase()] || m));

    if (simpleName !== p.name) {
      imageUrl = await fetchFotMobDetailed(simpleName, p.team);
      if (imageUrl) {
        await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
        found++;
        await delay(500);
        continue;
      }
    }

    // Try first name only for single-name players
    if (p.name.split(' ').length > 1) {
      const lastName = p.name.split(' ').pop();
      imageUrl = await fetchFotMobDetailed(lastName, p.team);
      if (imageUrl) {
        await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
        found++;
        await delay(500);
        continue;
      }
    }

    notFound++;
    await delay(200);
  }

  console.log(`\n\n📊 ROUND 2 SONUÇLAR:`);
  console.log(`  ✅ Bulundu: ${found}`);
  console.log(`  ❌ Bulunamadı: ${notFound}`);

  // Update remaining with better placeholders (team colored)
  if (notFound > 0) {
    const [remaining] = await connection.query(
      `SELECT id, name, team, cardQuality FROM players WHERE faceImageUrl LIKE '%ui-avatars%' OR faceImageUrl IS NULL OR faceImageUrl = ''`
    );

    for (const p of remaining) {
      const initials = p.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      const bgColor = { 'bronze': '8B5E3C', 'silver': '708090', 'gold': 'B8860B', 'elite': '8B0000' }[p.cardQuality] || '555555';
      const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=fff&size=256&bold=true&font-size=0.4`;
      await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [url, p.id]);
    }
    console.log(`  🎨 ${remaining.length} placeholder güncellendi`);
  }

  // Final stats
  const [stats] = await connection.query(`
    SELECT
      SUM(CASE WHEN faceImageUrl NOT LIKE '%ui-avatars%' AND faceImageUrl IS NOT NULL AND faceImageUrl != '' THEN 1 ELSE 0 END) as real_images,
      SUM(CASE WHEN faceImageUrl LIKE '%ui-avatars%' OR faceImageUrl IS NULL OR faceImageUrl = '' THEN 1 ELSE 0 END) as placeholders,
      COUNT(*) as total
    FROM players
  `);

  console.log(`\n📊 FİNAL DURUM:`);
  console.log(`  Gerçek fotoğraf: ${stats[0].real_images}`);
  console.log(`  Placeholder: ${stats[0].placeholders}`);
  console.log(`  Toplam: ${stats[0].total}`);

  await connection.end();
}

fetchRemaining().catch(console.error);
