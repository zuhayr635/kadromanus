/**
 * Final fix: Assign unique realistic male portraits to all generic players
 * Uses randomuser.me portraits - 100 unique male faces, always online
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

async function fixAll() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  const [players] = await connection.query(
    `SELECT id, name FROM players
     WHERE faceImageUrl LIKE '%ui-avatars%'
        OR faceImageUrl LIKE '%placeholder%'
        OR faceImageUrl LIKE 'data:%'
        OR faceImageUrl IS NULL
        OR faceImageUrl = ''
     ORDER BY id`
  );

  console.log(`🎨 ${players.length} oyuncuya gerçek yüz atanıyor...\n`);

  for (const p of players) {
    // Her oyuncuya ismine göre tutarlı bir erkek portre ata (0-99)
    const portraitId = hashName(p.name) % 100;
    const url = `https://randomuser.me/api/portraits/men/${portraitId}.jpg`;
    await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [url, p.id]);
  }

  console.log(`✅ ${players.length} oyuncu güncellendi\n`);

  // Final kontrol
  const [stats] = await connection.query(`
    SELECT
      CASE
        WHEN faceImageUrl LIKE '%futwiz%' THEN 'EA FC (Gercek Futbolcu)'
        WHEN faceImageUrl LIKE '%wikipedia%' OR faceImageUrl LIKE '%wikimedia%' THEN 'Wikipedia (Gercek)'
        WHEN faceImageUrl LIKE '%thesportsdb%' THEN 'TheSportsDB (Gercek)'
        WHEN faceImageUrl LIKE '%randomuser%' THEN 'RandomUser (Gercek Yuz)'
        WHEN faceImageUrl LIKE '%ui-avatars%' THEN 'UI Avatar (kalan)'
        WHEN faceImageUrl IS NULL OR faceImageUrl = '' THEN 'BOS!'
        ELSE 'Diger'
      END as kaynak,
      COUNT(*) as adet
    FROM players
    GROUP BY kaynak
    ORDER BY adet DESC
  `);

  console.table(stats);

  const [empty] = await connection.query(
    "SELECT COUNT(*) as cnt FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = ''"
  );
  console.log(`\nBos resim: ${empty[0].cnt}`);

  await connection.end();
}

fix().catch(console.error);

async function fix() {
  await fixAll();
}
