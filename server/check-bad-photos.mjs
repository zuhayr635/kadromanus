import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Check ui-avatars
  const [uia] = await conn.query("SELECT id, name, faceImageUrl FROM players WHERE faceImageUrl LIKE '%ui-avatars%'");
  console.log('ui-avatars kullanan:', uia.length);
  uia.forEach(r => console.log('  [' + r.id + '] ' + r.name + ': ' + r.faceImageUrl.substring(0, 80)));

  // Check randomuser
  const [ru] = await conn.query("SELECT id, name, faceImageUrl FROM players WHERE faceImageUrl LIKE '%randomuser%'");
  console.log('\nrandomuser kullanan:', ru.length);
  ru.forEach(r => console.log('  [' + r.id + '] ' + r.name + ': ' + r.faceImageUrl.substring(0, 80)));

  // Check NULL/empty
  const [empty] = await conn.query("SELECT id, name FROM players WHERE faceImageUrl IS NULL OR faceImageUrl = ''");
  console.log('\nBoş/NULL:', empty.length);
  empty.forEach(r => console.log('  [' + r.id + '] ' + r.name));

  // Check Hernández Simeone specifically
  const [hs] = await conn.query("SELECT id, name, faceImageUrl FROM players WHERE name LIKE '%Hern%Simeone%' OR name LIKE '%Simeone%'");
  console.log('\nHernández Simeone:', hs.length);
  hs.forEach(r => console.log('  [' + r.id + '] ' + r.name + ': ' + r.faceImageUrl));

  await conn.end();
}
check();