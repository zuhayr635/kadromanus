/**
 * Fix all SVG data URI images - replace with proper online avatars
 * Uses DiceBear API for professional football player avatars
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function fixImages() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Replace all SVG data URIs with DiceBear avatars (bottts style - robot/player look)
  const [svgPlayers] = await connection.query(
    "SELECT id, name, position, cardQuality FROM players WHERE faceImageUrl LIKE 'data:image/svg%'"
  );

  console.log(`🔧 ${svgPlayers.length} SVG avatar'ı düzeltiliyor...\n`);

  let count = 0;
  for (const p of svgPlayers) {
    // DiceBear Avatars - unique per player name, looks great
    const seed = encodeURIComponent(p.name);
    const bgColors = {
      bronze: 'b45309',
      silver: '94a3b8',
      gold: 'eab308',
      elite: 'a855f7',
    };
    const bg = bgColors[p.cardQuality] || '6b7280';

    // Use initials style - clean, professional
    const url = `https://api.dicebear.com/9.x/initials/png?seed=${seed}&backgroundColor=${bg}&fontSize=36&size=200`;

    await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [url, p.id]);
    count++;
  }

  console.log(`✅ ${count} avatar güncellendi\n`);

  // Final stats
  const [stats] = await connection.query(`
    SELECT
      CASE
        WHEN faceImageUrl LIKE '%futwiz%' THEN 'EA FC'
        WHEN faceImageUrl LIKE '%thesportsdb%' THEN 'TheSportsDB'
        WHEN faceImageUrl LIKE '%wikipedia%' OR faceImageUrl LIKE '%wikimedia%' THEN 'Wikipedia'
        WHEN faceImageUrl LIKE '%dicebear%' THEN 'DiceBear Avatar'
        WHEN faceImageUrl LIKE 'data:image/svg%' THEN 'SVG (kalan)'
        WHEN faceImageUrl IS NULL OR faceImageUrl = '' THEN 'YOK'
        ELSE 'Diğer'
      END as kaynak,
      COUNT(*) as adet
    FROM players
    GROUP BY kaynak
    ORDER BY adet DESC
  `);

  console.log('📊 Final Resim Kaynakları:');
  console.table(stats);

  await connection.end();
}

fixImages().catch(console.error);
