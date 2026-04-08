import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { players } from '../drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [stats] = await conn.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN faceImageUrl IS NOT NULL AND faceImageUrl != '' THEN 1 ELSE 0 END) as with_photos,
      SUM(CASE WHEN faceImageUrl IS NULL OR faceImageUrl = '' THEN 1 ELSE 0 END) as without_photos
    FROM players
  `);

  console.log('📊 FINAL DATABASE STATS:');
  console.log(`  Total Players: ${stats[0].total}`);
  console.log(`  With Photos: ${stats[0].with_photos} (${Math.round(stats[0].with_photos/stats[0].total*100)}%)`);
  console.log(`  Without Photos: ${stats[0].without_photos} (${Math.round(stats[0].without_photos/stats[0].total*100)}%)`);

  await conn.end();
}

check().catch(console.error);