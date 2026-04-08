/**
 * Fetch real player images from Wikipedia API
 * Falls back to Wikimedia Commons for better quality images
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const WIKIMEDIA_SEARCH = "https://commons.wikimedia.org/w/api.php";
const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function searchWikipedia(name) {
  try {
    // Try direct Wikipedia page first
    const res = await fetch(WIKIPEDIA_API + encodeURIComponent(name));
    if (res.ok) {
      const data = await res.json();
      if (data.thumbnail && data.thumbnail.source) {
        return data.thumbnail.source.replace(/\/\d+px-/, '/400px-'); // Higher resolution
      }
      if (data.originalimage && data.originalimage.source) {
        return data.originalimage.source;
      }
    }
  } catch (err) {
    console.error(`Wikipedia error for ${name}:`, err.message);
  }
  return null;
}

async function searchWikimediaCommons(name, sport = 'football') {
  try {
    const searchQuery = `${name} ${sport} player`;
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'search',
      srsearch: searchQuery,
      srnamespace: '6', // File namespace
      srlimit: '3',
    });

    const res = await fetch(`${WIKIMEDIA_SEARCH}?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.query && data.query.search && data.query.search.length > 0) {
      // Get the first result's file info
      const fileTitle = data.query.search[0].title;
      const infoParams = new URLSearchParams({
        action: 'query',
        format: 'json',
        titles: fileTitle,
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: '400',
      });

      const infoRes = await fetch(`${WIKIMEDIA_SEARCH}?${infoParams}`);
      if (!infoRes.ok) return null;

      const infoData = await infoRes.json();
      const pages = infoData.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        if (page.imageinfo && page.imageinfo[0]) {
          return page.imageinfo[0].thumburl || page.imageinfo[0].url;
        }
      }
    }
  } catch (err) {
    console.error(`Wikimedia error for ${name}:`, err.message);
  }
  return null;
}

async function updatePlayerImages() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Get players without real images (SVG avatars or ui-avatars)
  const [players] = await connection.query(`
    SELECT id, name, team, nation
    FROM players
    WHERE faceImageUrl LIKE 'data:image/svg%'
       OR faceImageUrl LIKE '%ui-avatars.com%'
       OR faceImageUrl IS NULL
    ORDER BY overall DESC
    LIMIT 500
  `);

  console.log(`🔍 ${players.length} oyuncu için Wikipedia'da arama yapılıyor...\n`);

  let found = 0;
  let notFound = 0;

  for (const p of players) {
    try {
      console.log(`  Arıyor: ${p.name}...`);

      // Try variations of the name
      const variations = [
        p.name,
        `${p.name} (footballer)`,
        `${p.name} (soccer)`,
      ];

      let imageUrl = null;

      // Try Wikipedia first
      for (const variant of variations) {
        imageUrl = await searchWikipedia(variant);
        if (imageUrl) {
          console.log(`    ✅ Wikipedia: ${p.name}`);
          break;
        }
        await delay(200);
      }

      // If not found, try Wikimedia Commons
      if (!imageUrl) {
        imageUrl = await searchWikimediaCommons(p.name);
        if (imageUrl) {
          console.log(`    ✅ Wikimedia: ${p.name}`);
        }
        await delay(300);
      }

      if (imageUrl) {
        await connection.query(
          "UPDATE players SET faceImageUrl = ? WHERE id = ?",
          [imageUrl, p.id]
        );
        found++;
      } else {
        console.log(`    ❌ Bulunamadı: ${p.name}`);
        notFound++;
      }

      await delay(500); // Rate limiting
    } catch (err) {
      console.error(`  Hata (${p.name}):`, err.message);
      notFound++;
    }
  }

  // Summary
  const [stats] = await connection.query(`
    SELECT
      CASE
        WHEN faceImageUrl LIKE '%futwiz%' OR faceImageUrl LIKE '%ea.com%' THEN 'EA FC'
        WHEN faceImageUrl LIKE '%thesportsdb%' THEN 'TheSportsDB'
        WHEN faceImageUrl LIKE '%wikipedia%' OR faceImageUrl LIKE '%wikimedia%' THEN 'Wikipedia'
        WHEN faceImageUrl LIKE 'data:image/svg%' THEN 'SVG Avatar'
        WHEN faceImageUrl LIKE '%ui-avatars%' THEN 'UI Avatars'
        WHEN faceImageUrl IS NULL OR faceImageUrl = '' THEN 'Yok'
        ELSE 'Diğer'
      END as source,
      COUNT(*) as count
    FROM players
    GROUP BY source
  `);

  console.log('\n📊 Güncel Resim Kaynakları:');
  console.table(stats);

  console.log(`\n🎯 Bu Çalışmada:`);
  console.log(`  Wikipedia'dan bulundu: ${found}`);
  console.log(`  Bulunamadı: ${notFound}`);

  await connection.end();
}

updatePlayerImages().catch(console.error);
