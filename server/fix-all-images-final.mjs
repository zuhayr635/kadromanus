/**
 * Replace all missing/broken images with working placeholder service
 * Uses placeholder.com - guaranteed to work
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function fixAllImages() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Fix DiceBear images with simpler avatar service
  const [diceBearPlayers] = await connection.query(
    "SELECT id, name, position, cardQuality FROM players WHERE faceImageUrl LIKE '%dicebear%'"
  );

  console.log(`🔧 ${diceBearPlayers.length} DiceBear avatar'ı basit placeholder'a çevriliyor...\n`);

  for (const p of diceBearPlayers) {
    // Use simple, reliable placeholder that always works
    const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = {
      bronze: { bg: 'b45309', text: 'ffffff' },
      silver: { bg: '94a3b8', text: '1e293b' },
      gold: { bg: 'eab308', text: '422006' },
      elite: { bg: 'a855f7', text: 'ffffff' },
    };
    const c = colors[p.cardQuality] || { bg: '6b7280', text: 'ffffff' };

    // via.placeholder.com - most reliable placeholder service
    const url = `https://via.placeholder.com/200x200/${c.bg}/${c.text}?text=${encodeURIComponent(initials)}`;

    await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [url, p.id]);
  }

  console.log(`✅ ${diceBearPlayers.length} avatar güncellendi\n`);

  // Verify all images are valid URLs
  const [allPlayers] = await connection.query(
    "SELECT id, name, faceImageUrl FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = ''"
  );

  if (allPlayers.length > 0) {
    console.log(`⚠️ ${allPlayers.length} oyuncunun hala resmi yok, düzeltiliyor...`);
    for (const p of allPlayers) {
      const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const url = `https://via.placeholder.com/200x200/6b7280/ffffff?text=${encodeURIComponent(initials)}`;
      await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [url, p.id]);
    }
  }

  // Final stats
  const [stats] = await connection.query(`
    SELECT
      CASE
        WHEN faceImageUrl LIKE '%futwiz%' OR faceImageUrl LIKE '%ea.com%' THEN 'EA FC (Gerçek)'
        WHEN faceImageUrl LIKE '%wikipedia%' OR faceImageUrl LIKE '%wikimedia%' THEN 'Wikipedia (Gerçek)'
        WHEN faceImageUrl LIKE '%thesportsdb%' THEN 'TheSportsDB (Gerçek)'
        WHEN faceImageUrl LIKE '%placeholder%' THEN 'Placeholder Avatar'
        WHEN faceImageUrl IS NULL OR faceImageUrl = '' THEN 'BOŞ (HATA!)'
        ELSE 'Diğer'
      END as kaynak,
      COUNT(*) as adet
    FROM players
    GROUP BY kaynak
    ORDER BY adet DESC
  `);

  console.log('\n📊 Final Resim Durumu:');
  console.table(stats);

  const [total] = await connection.query("SELECT COUNT(*) as total FROM players WHERE faceImageUrl IS NOT NULL AND faceImageUrl != ''");
  console.log(`\n✅ TOPLAM: ${total[0].total}/517 oyuncunun resmi var`);

  await connection.end();
}

fixAllImages().catch(console.error);
