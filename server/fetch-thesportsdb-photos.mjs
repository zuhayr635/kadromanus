import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { players } from '../drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function searchTheSportsDB(playerName) {
  try {
    const cleanName = playerName
      .replace(/[ćčđšžğü]/gi, m => ({ 'ć': 'c', 'č': 'c', 'đ': 'd', 'š': 's', 'ž': 'z', 'ğ': 'g', 'ü': 'u', 'ö': 'o' }[m.toLowerCase()] || m))
      .replace(/ß/g, 'ss');

    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(cleanName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.player && data.player.length > 0) {
      // Find best match with image
      for (const p of data.player) {
        if (p.strThumb && p.strThumb !== null && p.strThumb !== '') {
          return p.strThumb;
        }
      }
    }
  } catch (err) {
    // silent
  }
  return null;
}

async function fetchAllRemainingPhotos() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [rows] = await conn.query(
    'SELECT id, name, team FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = "" ORDER BY overall DESC'
  );

  console.log(`📷 ${rows.length} fotoğrafsız oyuncu için TheSportsDB araması...\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    process.stdout.write(`\r  [${i + 1}/${rows.length}] ${p.name.padEnd(35)}`);

    let imageUrl = await searchTheSportsDB(p.name);
    if (imageUrl) {
      await conn.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
      found++;
      await delay(400);
      continue;
    }

    notFound++;
    await delay(200);
  }

  console.log(`\n\n📊 Sonuç: ${found} bulundu, ${notFound} yok`);

  // Check remaining
  const [remaining] = await conn.query('SELECT COUNT(*) as cnt FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = ""');
  console.log(`⚠️ Hala fotoğrafsız: ${remaining[0].cnt}`);

  await conn.end();
}

fetchAllRemainingPhotos().catch(console.error);