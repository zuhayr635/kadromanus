import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { players } from '../drizzle/schema.ts';
import dotenv from 'dotenv';

dotenv.config();

async function findDuplicates() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Find duplicate names
  const [duplicates] = await conn.query(`
    SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM players
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `);

  console.log(`🔍 ${duplicates.length} duplicate isim bulundu:\n`);

  let totalToRemove = 0;
  const idsToRemove = [];

  for (const dup of duplicates) {
    console.log(`"${dup.name}": ${dup.count} adet (IDs: ${dup.ids})`);
    const ids = dup.ids.split(',').map(Number);
    // Keep the first one, remove the rest
    ids.slice(1).forEach(id => idsToRemove.push(id));
    totalToRemove += dup.count - 1;
  }

  console.log(`\n🗑️ Silinecek: ${totalToRemove} oyuncu`);

  if (totalToRemove > 0) {
    await conn.query(
      `DELETE FROM players WHERE id IN (${idsToRemove.join(',')})`
    );
    console.log(`✅ ${totalToRemove} duplicate silindi!`);
  }

  // Check remaining count
  const [stats] = await conn.query('SELECT COUNT(*) as total FROM players');
  console.log(`\n📊 Kalan oyuncu: ${stats[0].total}`);

  await conn.end();
}

findDuplicates().catch(console.error);