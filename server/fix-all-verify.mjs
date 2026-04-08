import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function fix() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Get ALL players, check every single image through proxy-like fetch
  const [all] = await connection.query("SELECT id, name, faceImageUrl FROM players ORDER BY overall DESC");

  console.log(`Checking ${all.length} images...\n`);

  let ok = 0;
  let broken = [];

  for (const p of all) {
    const url = p.faceImageUrl;
    if (!url) { broken.push(p); continue; }

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.futwiz.com/' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        ok++;
      } else {
        broken.push(p);
      }
    } catch {
      broken.push(p);
    }
  }

  console.log(`✅ OK: ${ok}`);
  console.log(`❌ Broken: ${broken.length}\n`);

  // Fix ALL broken with randomuser.me
  for (const p of broken) {
    let h = 0;
    for (let i = 0; i < p.name.length; i++) h = p.name.charCodeAt(i) + ((h << 5) - h);
    const portraitId = Math.abs(h) % 100;
    const newUrl = `https://randomuser.me/api/portraits/men/${portraitId}.jpg`;
    await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [newUrl, p.id]);
    console.log(`  Fixed: ${p.name} → men/${portraitId}.jpg`);
  }

  // Verify ALL again
  console.log(`\nRe-checking all...`);
  const [all2] = await connection.query("SELECT id, name, faceImageUrl FROM players ORDER BY overall DESC");
  let finalOk = 0;
  let finalBad = 0;
  for (const p of all2) {
    try {
      const res = await fetch(p.faceImageUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) finalOk++;
      else { finalBad++; console.log(`  STILL BROKEN: ${p.name} → ${p.faceImageUrl.slice(0,80)}`); }
    } catch {
      finalBad++;
      console.log(`  STILL BROKEN: ${p.name} → ${p.faceImageUrl.slice(0,80)}`);
    }
  }

  console.log(`\n========== FINAL ==========`);
  console.log(`✅ Working: ${finalOk}`);
  console.log(`❌ Broken:  ${finalBad}`);
  console.log(`📦 Total:   ${all2.length}`);
  console.log(`============================`);

  await connection.end();
}

fix().catch(console.error);
