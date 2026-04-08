/**
 * Check ALL player images - verify each URL actually returns a valid image
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function checkAll() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [players] = await connection.query("SELECT id, name, faceImageUrl FROM players ORDER BY overall DESC");

  console.log(`\n🔍 ${players.length} oyuncunun resim URL'si kontrol ediliyor...\n`);

  let valid = 0;
  let broken = 0;
  let missing = 0;
  const brokenList = [];
  const missingList = [];

  for (const p of players) {
    const url = p.faceImageUrl;

    if (!url || url === '') {
      missing++;
      missingList.push(p);
      continue;
    }

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });

      const ct = res.headers.get('content-type') || '';
      const isImage = ct.startsWith('image/') || ct === 'application/octet-stream';

      if (res.ok && isImage) {
        valid++;
      } else {
        broken++;
        brokenList.push({ ...p, status: res.status, contentType: ct });
      }
    } catch (err) {
      broken++;
      brokenList.push({ ...p, status: 'ERR', contentType: err.message.slice(0, 60) });
    }

    // Progress
    if ((valid + broken + missing) % 50 === 0) {
      console.log(`  Checked ${valid + broken + missing}/${players.length}...`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 SONUÇLAR`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  ✅ Çalışan resim:  ${valid}`);
  console.log(`  ❌ Kırık URL:      ${broken}`);
  console.log(`  ⚠️  Resim yok:     ${missing}`);
  console.log(`  📦 Toplam:         ${players.length}`);
  console.log(`${'='.repeat(50)}\n`);

  if (broken > 0) {
    console.log(`❌ KIRIK URL'LER (${broken}):`);
    brokenList.slice(0, 30).forEach(p => {
      console.log(`  ${p.name.padEnd(25)} | HTTP ${p.status} | ${p.contentType}`);
    });
    if (broken > 30) console.log(`  ... ve ${broken - 30} daha`);
    console.log('');
  }

  if (missing > 0) {
    console.log(`⚠️ RESİM YOK (${missing}):`);
    missingList.forEach(p => {
      console.log(`  ${p.name}`);
    });
    console.log('');
  }

  // Group by domain
  const domainStats = {};
  for (const p of players) {
    const url = p.faceImageUrl;
    if (!url) { domainStats['YOK'] = (domainStats['YOK'] || 0) + 1; continue; }
    try {
      const domain = new URL(url).hostname;
      domainStats[domain] = (domainStats[domain] || 0) + 1;
    } catch {
      domainStats['invalid'] = (domainStats['invalid'] || 0) + 1;
    }
  }

  console.log(`🌐 Domain bazında:`);
  Object.entries(domainStats).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => {
    console.log(`  ${d.padEnd(35)} ${c}`);
  });

  await connection.end();
}

checkAll().catch(console.error);
