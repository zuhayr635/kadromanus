import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [missing] = await conn.query("SELECT id, name FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = ''");
  console.log('Fotoğrafsız oyuncular:', missing);

  if (missing.length > 0) {
    const ids = missing.map(p => p.id);
    await conn.query(`DELETE FROM players WHERE id IN (${ids.join(',')})`);
    console.log(`✅ ${ids.length} oyuncu silindi`);
  }

  const [stats] = await conn.query('SELECT COUNT(*) as total FROM players');
  console.log(`📊 Toplam: ${stats[0].total}`);

  await conn.end();
}

fix().catch(console.error);