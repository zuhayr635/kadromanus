/**
 * Final solution: Use stock football player images for generic names
 * Real players get real photos, generic names get realistic placeholders
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Unsplash football player collection
const FOOTBALL_PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1569517282132-25d22f4573e6?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1611175820960-c238b86f772e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1584863231364-2edc166de576?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1521733852567-hfd9d840a9a5?w=200&h=200&fit=crop&crop=faces',
];

// Avatar API with football theme
function getFootballAvatar(name, index) {
  // Use consistent placeholder for same player
  const imageIndex = index % FOOTBALL_PLACEHOLDER_IMAGES.length;
  return FOOTBALL_PLACEHOLDER_IMAGES[imageIndex];
}

async function fixGenericPlayers() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  const [genericPlayers] = await connection.query(
    `SELECT id, name FROM players
     WHERE faceImageUrl LIKE '%ui-avatars%'
     ORDER BY id`
  );

  console.log(`🎨 ${genericPlayers.length} generic oyuncuya futbolcu placeholder ekleniyor...\n`);

  for (let i = 0; i < genericPlayers.length; i++) {
    const p = genericPlayers[i];
    const imageUrl = getFootballAvatar(p.name, i);
    await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);

    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${genericPlayers.length} güncellendi...`);
    }
  }

  console.log(`\n✅ ${genericPlayers.length} oyuncu güncellendi`);

  // Final stats
  const [stats] = await connection.query(`
    SELECT
      CASE
        WHEN faceImageUrl LIKE '%futwiz%' OR faceImageUrl LIKE '%ea.com%' THEN 'EA FC (Gerçek)'
        WHEN faceImageUrl LIKE '%wikipedia%' OR faceImageUrl LIKE '%wikimedia%' THEN 'Wikipedia (Gerçek)'
        WHEN faceImageUrl LIKE '%thesportsdb%' THEN 'TheSportsDB (Gerçek)'
        WHEN faceImageUrl LIKE '%unsplash%' THEN 'Futbolcu Placeholder'
        WHEN faceImageUrl LIKE '%ui-avatars%' THEN 'UI Avatar (kalan)'
        ELSE 'Diğer'
      END as kaynak,
      COUNT(*) as adet
    FROM players
    GROUP BY kaynak
    ORDER BY adet DESC
  `);

  console.log('\n📊 Final Durum:');
  console.table(stats);

  await connection.end();
}

fixGenericPlayers().catch(console.error);
