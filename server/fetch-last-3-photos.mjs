import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function wikiSearch(name) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.query?.search?.length) return null;

  const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(data.query.search[0].title)}&prop=pageimages&format=json&origin=*`;
  const imgRes = await fetch(imgUrl);
  if (!imgRes.ok) return null;
  const imgData = await imgRes.json();
  const pages = imgData.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (page?.thumbnail?.source) {
    return page.thumbnail.source.replace(/\/\d+px-/, '/300px-');
  }
  return null;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Fetch for Fran García, Bruno Lourenço, Batista Mendy
  const targets = [
    { id: 2071, name: "Fran García" },
    { id: 2203, name: "Bruno Lourenço" },
    { id: 1932, name: "Batista Mendy" },
  ];

  for (const p of targets) {
    const url = await wikiSearch(p.name);
    if (url) {
      await conn.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [url, p.id]);
      console.log(`✅ ${p.name}: ${url.substring(0, 70)}...`);
    } else {
      console.log(`❌ ${p.name}: not found`);
    }
    await delay(500);
  }

  // Final check
  const [stats] = await conn.query("SELECT COUNT(*) as total, SUM(CASE WHEN faceImageUrl IS NULL OR faceImageUrl = '' THEN 1 ELSE 0 END) as noPhoto FROM players");
  console.log(`\n📊 Final: ${stats[0].total} players, ${stats[0].noPhoto} without photos`);

  await conn.end();
}

main();