import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { players } from '../drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function searchTransfermarkt(playerName) {
  try {
    // Transfermarkt search page
    const searchUrl = `https://www.transfermarkt.com/suche?query=${encodeURIComponent(playerName)}&spielergebnis=yw`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Look for image URL in HTML response
    // Pattern: /portraits/header/xxxxxxx-xxxxxxxx.png
    const imgMatch = html.match(/\/portraits\/header\/([a-z0-9-]{36,})\.png/i);
    if (imgMatch) {
      const id = imgMatch[1];
      // Get the actual image URL
      return `https://img.a.transfermarkt.technology/portrait/big/${id}-1671799251.png`;
    }
  } catch (err) {
    // silent
  }
  return null;
}

async function fetchTransfermarktPhotos() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [rows] = await conn.query(
    'SELECT id, name, team FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = "" LIMIT 160'
  );

  console.log(`📷 ${rows.length} oyuncu için Transfermarkt araması...\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    process.stdout.write(`\r  [${i + 1}/${rows.length}] ${p.name.padEnd(35)}`);

    let imageUrl = await searchTransfermarkt(p.name);
    if (imageUrl) {
      await conn.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
      found++;
      await delay(500);
      continue;
    }

    notFound++;
    await delay(200);
  }

  console.log(`\n\n📊 Sonuç: ${found} bulundu, ${notFound} yok`);

  const [remaining] = await conn.query('SELECT COUNT(*) as cnt FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = ""');
  console.log(`⚠️ Hala fotoğrafsız: ${remaining[0].cnt}`);

  await conn.end();
}

fetchTransfermarktPhotos().catch(console.error);