import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function tryMultiple(name, ...searches) {
  for (const term of searches) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.query?.search?.length) {
        const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(data.query.search[0].title)}&prop=pageimages&pithumbsize=300&format=json&origin=*`;
        const imgRes = await fetch(imgUrl);
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const pages = imgData.query?.pages;
          if (pages && Object.values(pages)[0]?.thumbnail?.source) {
            const url = Object.values(pages)[0].thumbnail.source;
            console.log(`✅ ${name}: "${term}" → found`);
            return url;
          }
        }
      }
    } catch (e) { /* skip */ }
  }
  console.log(`❌ ${name}: no match`);
  return null;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Try multiple searches
  const targets = [
    { id: 2071, name: "Fran García", searches: ["Fran García footballer", "Fran Garcia Real Madrid", "Fran Garcia Spain"] },
    { id: 2203, name: "Bruno Lourenço", searches: ["Bruno Lourenço footballer", "Bruno Lourenco Braga", "Bruno Lourenco Portugal"] },
    { id: 1932, name: "Batista Mendy", searches: ["Batista Mendy footballer", "Batista Mendy Trabzonspor", "Batista Mendy France"] },
  ];

  for (const p of targets) {
    const url = await tryMultiple(p.name, ...p.searches);
    if (url) {
      await conn.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [url, p.id]);
    }
    await delay(500);
  }

  // If still no photos, delete these players
  const [missing] = await conn.query("SELECT id, name FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = ''");
  if (missing.length > 0) {
    const ids = missing.map(m => m.id);
    await conn.query(`DELETE FROM players WHERE id IN (${ids.join(',')})`);
    console.log(`\n🗑️ ${missing.length} oyuncu silindi (fotoğraf yok)`);
  }

  // Final stats
  const [stats] = await conn.query("SELECT COUNT(*) as total FROM players");
  const [byQuality] = await conn.query("SELECT cardQuality, COUNT(*) as cnt FROM players GROUP BY cardQuality ORDER BY FIELD(cardQuality, 'bronze', 'silver', 'gold', 'elite')");
  const [photoCheck] = await conn.query("SELECT COUNT(*) as withPhotos FROM players WHERE faceImageUrl IS NOT NULL AND faceImageUrl != ''");

  console.log(`\n📊 FINAL DATABASE:`);
  console.log(`  Total: ${stats[0].total}`);
  console.log(`  With Photos: ${photoCheck[0].withPhotos}`);
  byQuality.forEach(q => console.log(`  ${q.cardQuality}: ${q.cnt}`));

  await conn.end();
}

main();