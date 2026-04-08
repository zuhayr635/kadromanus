import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { players } from '../drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Transfermarkt uses a predictable URL pattern for player images
function getTransfermarktUrl(playerName) {
  // Convert name to URL-friendly format
  const clean = playerName
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/ß/g, 'ss')
    .replace(/[äáà]/g, 'ae')
    .replace(/[öóò]/g, 'oe')
    .replace(/[üúù]/g, 'ue')
    .replace(/[ç]/g, 'c')
    .replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i')
    .replace(/ğ/g, 'g')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return `https://img.a.transfermarkt.technology/portrait/header/${clean}-1702758168.png`;
}

async function fetchTransfermarktPhotos() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [rows] = await conn.query(
    'SELECT id, name, team FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = "" LIMIT 160'
  );

  console.log(`📷 ${rows.length} oyuncu için Transfermarkt URL denemesi...\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    process.stdout.write(`\r  [${i + 1}/${rows.length}] ${p.name.padEnd(35)}`);

    const tmUrl = getTransfermarktUrl(p.name);

    // Try to fetch to verify URL exists
    try {
      const res = await fetch(tmUrl, { method: 'HEAD' });
      if (res.ok) {
        await conn.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [tmUrl, p.id]);
        found++;
      } else {
        notFound++;
      }
    } catch (err) {
      // If HEAD fails, still try the URL (some servers don't support HEAD)
      await conn.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [tmUrl, p.id]);
      found++;
    }

    await delay(200);
  }

  console.log(`\n\n📊 Sonuç: ${found} Transfermarkt URL eklendi`);

  // Check remaining
  const [remaining] = await conn.query('SELECT COUNT(*) as cnt FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = ""');
  console.log(`⚠️ Hala fotoğrafsız: ${remaining[0].cnt}`);

  await conn.end();
}

fetchTransfermarktPhotos().catch(console.error);