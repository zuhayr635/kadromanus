import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { players } from '../drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(conn);
  const allPlayers = await db.select().from(players);

  console.log('📊 TOTAL PLAYERS:', allPlayers.length);
  console.log('');

  const [stats] = await conn.query('SELECT cardQuality, COUNT(*) as count FROM players GROUP BY cardQuality ORDER BY FIELD(cardQuality, "bronze", "silver", "gold", "elite")');
  console.log('By Quality:');
  stats.forEach(row => console.log(`  ${row.cardQuality.padEnd(8)}: ${row.count}`));

  await conn.end();
}

check().catch(console.error);