/**
 * Replace ALL randomuser images with REAL player photos from TheSportsDB
 * Try multiple variations of each name to find the best match
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function searchPlayer(name) {
  const variations = [
    name,
    `${name} footballer`,
    `${name} soccer`,
    `${name} football player`,
  ];

  for (const variant of variations) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(variant)}`,
        { signal: AbortSignal.timeout(7000) }
      );

      if (!res.ok) continue;

      const data = await res.json();
      if (!data.player || data.player.length === 0) continue;

      // Find best match - prefer Soccer players with images
      for (const p of data.player) {
        if (p.strSport === 'Soccer' || p.strSport === 'Association Football') {
          // Prefer cutout (transparent background) over thumb
          if (p.strCutout) {
            // Verify it works
            try {
              const check = await fetch(p.strCutout, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
              if (check.ok) return p.strCutout;
            } catch {}
          }
          if (p.strThumb) {
            try {
              const check = await fetch(p.strThumb, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
              if (check.ok) return p.strThumb;
            } catch {}
          }
        }
      }

      await delay(300);
    } catch (err) {
      console.error(`  Error searching ${variant}:`, err.message);
    }
  }

  return null;
}

async function fixAll() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  const [randomUserPlayers] = await connection.query(
    `SELECT id, name, team, nation FROM players
     WHERE faceImageUrl LIKE '%randomuser%'
     ORDER BY overall DESC`
  );

  console.log(`🔍 ${randomUserPlayers.length} oyuncu için GERÇEK fotoğraf aranıyor...\n`);

  let found = 0;
  let notFound = 0;
  const notFoundList = [];

  for (let i = 0; i < randomUserPlayers.length; i++) {
    const p = randomUserPlayers[i];
    console.log(`[${i + 1}/${randomUserPlayers.length}] Arıyor: ${p.name}...`);

    // Try with full name
    let imageUrl = await searchPlayer(p.name);

    // Try with team name added
    if (!imageUrl && p.team && p.team !== 'Unknown') {
      imageUrl = await searchPlayer(`${p.name} ${p.team}`);
    }

    // Try with nation
    if (!imageUrl && p.nation && p.nation !== 'Unknown') {
      imageUrl = await searchPlayer(`${p.name} ${p.nation}`);
    }

    if (imageUrl) {
      await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
      console.log(`  ✅ Bulundu: ${imageUrl.slice(0, 80)}...\n`);
      found++;
    } else {
      console.log(`  ❌ Bulunamadı\n`);
      notFound++;
      notFoundList.push(p.name);
    }

    await delay(500); // Rate limit
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 SONUÇ`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  ✅ Gerçek fotoğraf bulundu:  ${found}`);
  console.log(`  ❌ Bulunamadı:              ${notFound}`);
  console.log(`  📦 Toplam işlendi:          ${randomUserPlayers.length}`);
  console.log(`${'='.repeat(60)}\n`);

  if (notFound > 0) {
    console.log(`⚠️ Bulunamayanlar (${notFound}):`);
    notFoundList.slice(0, 50).forEach(name => console.log(`  - ${name}`));
    if (notFound > 50) console.log(`  ... ve ${notFound - 50} daha`);
  }

  // Final stats
  const [stats] = await connection.query(`
    SELECT
      CASE
        WHEN faceImageUrl LIKE '%thesportsdb%' OR faceImageUrl LIKE '%r2.thesportsdb%' THEN 'TheSportsDB (Gerçek)'
        WHEN faceImageUrl LIKE '%randomuser%' THEN 'RandomUser (Generic)'
        ELSE 'Diğer'
      END as kaynak,
      COUNT(*) as adet
    FROM players GROUP BY kaynak ORDER BY adet DESC
  `);

  console.log(`\n📊 Final Kaynak Dağılımı:`);
  console.table(stats);

  await connection.end();
}

fixAll().catch(console.error);
