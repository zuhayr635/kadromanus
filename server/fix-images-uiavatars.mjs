import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function fix() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  const [players] = await connection.query(
    "SELECT id, name, cardQuality FROM players WHERE faceImageUrl LIKE '%placeholder%' OR faceImageUrl LIKE '%dicebear%' OR faceImageUrl LIKE 'data:image%' OR faceImageUrl IS NULL OR faceImageUrl = ''"
  );

  console.log(`Fixing ${players.length} broken images...\n`);

  const colors = {
    bronze: 'b45309',
    silver: '64748b',
    gold: 'ca8a04',
    elite: '7c3aed',
  };

  for (const p of players) {
    const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const bg = colors[p.cardQuality] || '6b7280';
    const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bg}&color=ffffff&size=200&bold=true&format=png`;
    await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [url, p.id]);
  }

  console.log(`Done! ${players.length} images fixed.`);

  const [stats] = await connection.query(`
    SELECT
      CASE
        WHEN faceImageUrl LIKE '%futwiz%' THEN 'EA FC'
        WHEN faceImageUrl LIKE '%wikipedia%' OR faceImageUrl LIKE '%wikimedia%' THEN 'Wikipedia'
        WHEN faceImageUrl LIKE '%thesportsdb%' THEN 'TheSportsDB'
        WHEN faceImageUrl LIKE '%ui-avatars%' THEN 'UI Avatars'
        ELSE CONCAT('Other: ', LEFT(faceImageUrl, 40))
      END as src,
      COUNT(*) as cnt
    FROM players GROUP BY src ORDER BY cnt DESC
  `);
  console.table(stats);
  await connection.end();
}
fix().catch(console.error);
