import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { players } from '../drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function searchWikipedia(playerName) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(playerName + ' footballer')}&format=json&origin=*`;
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.query?.search?.length) return null;
    const title = data.query.search[0].title;
    const imagesUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&origin=*`;
    const imagesRes = await fetch(imagesUrl);
    if (!imagesRes.ok) return null;
    const imagesData = await imagesRes.json();
    const pages = imagesData.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null;
    const page = pages[pageId];
    if (page?.pageimage) {
      return `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(page.pageimage)}?width=200`;
    }
  } catch (err) {
    // silent
  }
  return null;
}

async function fetchMissingPhotos() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(conn);

  const [rows] = await conn.query(
    'SELECT id, name, team FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = "" LIMIT 200'
  );

  console.log(`📷 ${rows.length} oyuncu için fotoğraf aranıyor...\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    process.stdout.write(`\r  [${i + 1}/${rows.length}] ${p.name.padEnd(35)}`);

    let imageUrl = await searchWikipedia(p.name);
    if (imageUrl) {
      await conn.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
      found++;
      await delay(300);
      continue;
    }

    notFound++;
    await delay(100);
  }

  console.log(`\n\n📊 Sonuç: ${found} bulundu, ${notFound} yok`);

  // Check remaining without images
  const [remaining] = await conn.query('SELECT COUNT(*) as cnt FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = ""');
  console.log(`⚠️ Hala fotoğrafsız: ${remaining[0].cnt}`);

  await conn.end();
}

fetchMissingPhotos().catch(console.error);