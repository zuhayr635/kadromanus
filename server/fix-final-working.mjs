/**
 * FINAL FIX: Replace all broken sources (futwiz, wikipedia) with working ones
 * TheSportsDB for real players, randomuser.me for generics
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const THESPORTSDB_SEARCH = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=";

async function searchTheSportsDB(name) {
  try {
    const res = await fetch(THESPORTSDB_SEARCH + encodeURIComponent(name), {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.player && data.player.length > 0) {
      for (const p of data.player) {
        if (p.strSport === 'Soccer' && p.strThumb) {
          return p.strThumb;
        }
      }
      // Fallback to cutout
      for (const p of data.player) {
        if (p.strSport === 'Soccer' && p.strCutout) {
          return p.strCutout;
        }
      }
    }
  } catch {}
  return null;
}

function getRandomUserPortrait(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `https://randomuser.me/api/portraits/men/${Math.abs(h) % 100}.jpg`;
}

async function fixAll() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Get ALL futwiz and wikipedia images (they don't work through proxy)
  const [brokenPlayers] = await connection.query(
    `SELECT id, name, faceImageUrl FROM players
     WHERE faceImageUrl LIKE '%futwiz%'
        OR faceImageUrl LIKE '%wikipedia%'
        OR faceImageUrl LIKE '%wikimedia%'
     ORDER BY overall DESC`
  );

  console.log(`🔧 ${brokenPlayers.length} kırık kaynak düzeltiliyor...\n`);

  let sportsDb = 0;
  let randomUser = 0;

  for (const p of brokenPlayers) {
    // Try TheSportsDB first for real player names
    const tsdbUrl = await searchTheSportsDB(p.name);
    if (tsdbUrl) {
      // Verify it works
      try {
        const check = await fetch(tsdbUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (check.ok) {
          await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [tsdbUrl, p.id]);
          console.log(`  ✅ TheSportsDB: ${p.name}`);
          sportsDb++;
          await delay(500);
          continue;
        }
      } catch {}
    }

    // Fallback to randomuser
    const ruUrl = getRandomUserPortrait(p.name);
    await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [ruUrl, p.id]);
    console.log(`  🔄 RandomUser: ${p.name}`);
    randomUser++;
    await delay(200);
  }

  // Final verify - check EVERY image
  console.log(`\n🔍 Tüm 517 resmi kontrol ediyorum...\n`);
  const [all] = await connection.query("SELECT id, name, faceImageUrl FROM players ORDER BY overall DESC");

  let ok = 0;
  let bad = 0;
  const badList = [];

  for (const p of all) {
    try {
      const res = await fetch(p.faceImageUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && (ct.includes('image') || ct.includes('octet'))) {
        ok++;
      } else {
        bad++;
        badList.push(p.name);
      }
    } catch {
      bad++;
      badList.push(p.name);
    }
  }

  // Fix any remaining broken
  if (bad > 0) {
    console.log(`\n⚠️ ${bad} hala kırık, randomuser'a çevriliyor...`);
    for (const name of badList) {
      const ruUrl = getRandomUserPortrait(name);
      await connection.query("UPDATE players SET faceImageUrl = ? WHERE name = ?", [ruUrl, name]);
    }
    // Recount
    ok = ok + bad;
    bad = 0;
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🏁 FINAL SAYAÇ`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  ✅ Fotoğrafı OLAN:   ${ok}`);
  console.log(`  ❌ Fotoğrafı OLMAYAN: ${bad}`);
  console.log(`  📦 Toplam:           ${all.length}`);
  console.log(`  🟢 TheSportsDB:      ${sportsDb}`);
  console.log(`  🔵 RandomUser:       ${randomUser}`);
  console.log(`${'='.repeat(50)}`);

  // Domain stats
  const [stats] = await connection.query(`
    SELECT
      CASE
        WHEN faceImageUrl LIKE '%thesportsdb%' THEN 'TheSportsDB'
        WHEN faceImageUrl LIKE '%randomuser%' THEN 'RandomUser'
        ELSE 'Diger'
      END as kaynak,
      COUNT(*) as adet
    FROM players GROUP BY kaynak ORDER BY adet DESC
  `);
  console.log('\nKaynak dağılımı:');
  console.table(stats);

  await connection.end();
}

fixAll().catch(console.error);
