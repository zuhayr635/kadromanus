import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Multiple search strategies
async function findPhoto(name, team) {
  const strategies = [
    // Strategy 1: Full name + "footballer"
    () => wikiSearch(name + ' footballer'),
    // Strategy 2: Full name + "soccer"
    () => wikiSearch(name + ' soccer'),
    // Strategy 3: Just the name
    () => wikiSearch(name),
    // Strategy 4: Name + team
    () => wikiSearch(name + ' ' + team),
    // Strategy 5: Surname only (for players like "Mbappé" → "Kylian Mbappé")
    () => {
      const parts = name.split(' ');
      if (parts.length > 1) return wikiSearch(parts[parts.length - 1] + ' footballer');
      return Promise.resolve(null);
    },
    // Strategy 6: TheSportsDB full name
    () => tdbSearch(name),
    // Strategy 7: TheSportsDB surname
    () => {
      const parts = name.split(' ');
      if (parts.length > 1) return tdbSearch(parts[parts.length - 1]);
      return Promise.resolve(null);
    },
    // Strategy 8: Wikimedia Commons
    () => commonsSearch(name),
  ];

  for (const strategy of strategies) {
    try {
      const url = await strategy();
      if (url) return url;
    } catch (e) { /* next strategy */ }
    await delay(100);
  }
  return null;
}

async function wikiSearch(query) {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  const res = await fetch(searchUrl);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.query?.search?.length) return null;

  for (const result of data.query.search.slice(0, 3)) {
    const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(result.title)}&prop=pageimages&format=json&origin=*`;
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) continue;
    const imgData = await imgRes.json();
    const pages = imgData.query?.pages;
    if (!pages) continue;
    const page = Object.values(pages)[0];
    if (page?.thumbnail?.source) {
      return page.thumbnail.source.replace(/\/\d+px-/, '/300px-');
    }
    if (page?.pageimage) {
      return `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(page.pageimage)}?width=300`;
    }
  }
  return null;
}

async function tdbSearch(query) {
  const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.player) {
    for (const p of data.player) {
      if (p.strCutout && p.strCutout !== '') return p.strCutout;
      if (p.strThumb && p.strThumb !== '') return p.strThumb;
      if (p.strRender && p.strRender !== '') return p.strRender;
    }
  }
  return null;
}

async function commonsSearch(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + ' football')}&srnamespace=6&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.query?.search?.length) return null;
  for (const result of data.query.search.slice(0, 2)) {
    const title = result.title.replace('File:', '');
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}?width=300`;
  }
  return null;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [rows] = await conn.query(
    'SELECT id, name, team FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = "" ORDER BY overall DESC'
  );

  console.log(`📷 ${rows.length} fotoğrafsız oyuncu için agresif arama başlıyor...\n`);

  let found = 0;
  let notFound = 0;
  const stillMissing = [];

  for (let i = 0; i < rows.length; i++) {
    const p = rows[i];
    process.stdout.write(`\r  [${i + 1}/${rows.length}] ${p.name.padEnd(35)} `);

    const imageUrl = await findPhoto(p.name, p.team);
    if (imageUrl) {
      await conn.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
      process.stdout.write('✅');
      found++;
    } else {
      process.stdout.write('❌');
      stillMissing.push(p.name);
      notFound++;
    }
    await delay(300);
  }

  console.log(`\n\n📊 Sonuç: ${found} bulundu, ${notFound} yok`);

  if (stillMissing.length > 0) {
    console.log(`\n❌ Hala fotoğrafsız (${stillMissing.length}):`);
    stillMissing.forEach(n => console.log(`   - ${n}`));
  }

  await conn.end();
}

main().catch(console.error);