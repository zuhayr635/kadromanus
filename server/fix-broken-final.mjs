/**
 * Fix the 49 broken images:
 * - EA FC 404s: wrong player IDs, find correct ones or use Wikipedia
 * - Wikipedia 429s: rate limited, replace with randomuser.me
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// Correct EA FC player IDs (the ones that returned 404)
const correctedEaIds = {
  "Jude Bellingham": 270894,       // FC25 new ID
  "Victor Osimhen": 236523,
  "Florian Wirtz": 263286,
  "Declan Rice": 237110,
  "William Saliba": 249300,
  "Joško Gvardiol": 256798,
  "Aurélien Tchouaméni": 249463,
  "Eduardo Camavinga": 259287,
  "Wilfried Zaha": 197424,
  "Rafa Silva": 226963,
  "Lucas Torreira": 229427,
};

async function fixBroken() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // 1. Get all players and check each one
  const [players] = await connection.query("SELECT id, name, faceImageUrl, cardQuality FROM players ORDER BY overall DESC");

  console.log(`🔍 ${players.length} resim kontrol ediliyor...\n`);

  let fixed = 0;
  let alreadyOk = 0;
  let fixFailed = 0;

  for (const p of players) {
    const url = p.faceImageUrl;
    if (!url) continue;

    let isBroken = false;
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      const ct = res.headers.get('content-type') || '';
      isBroken = !res.ok || (!ct.startsWith('image/') && ct !== 'application/octet-stream');
    } catch {
      isBroken = true;
    }

    if (!isBroken) {
      alreadyOk++;
      continue;
    }

    // This image is broken, fix it
    console.log(`  ❌ Kırık: ${p.name} → ${url.slice(0, 60)}...`);

    let newUrl = null;

    // Check if we have a corrected EA FC ID
    if (correctedEaIds[p.name]) {
      const eaUrl = `https://cdn.futwiz.com/assets/img/fc25/faces/${correctedEaIds[p.name]}.png`;
      try {
        const test = await fetch(eaUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (test.ok) {
          newUrl = eaUrl;
          console.log(`    ✅ EA FC (corrected ID): ${correctedEaIds[p.name]}`);
        }
      } catch {}
    }

    // Try Wikipedia
    if (!newUrl) {
      try {
        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.name)}`, {
          signal: AbortSignal.timeout(5000)
        });
        if (wikiRes.ok) {
          const data = await wikiRes.json();
          if (data.thumbnail?.source) {
            newUrl = data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
            console.log(`    ✅ Wikipedia`);
          }
        }
        await delay(300);
      } catch {}
    }

    // Try Wikipedia with (footballer) suffix
    if (!newUrl) {
      try {
        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.name + ' (footballer)')}`, {
          signal: AbortSignal.timeout(5000)
        });
        if (wikiRes.ok) {
          const data = await wikiRes.json();
          if (data.thumbnail?.source) {
            newUrl = data.thumbnail.source.replace(/\/\d+px-/, '/400px-');
            console.log(`    ✅ Wikipedia (footballer)`);
          }
        }
        await delay(300);
      } catch {}
    }

    // Fallback: randomuser.me (guaranteed to work)
    if (!newUrl) {
      let h = 0;
      for (let i = 0; i < p.name.length; i++) h = p.name.charCodeAt(i) + ((h << 5) - h);
      const portraitId = Math.abs(h) % 100;
      newUrl = `https://randomuser.me/api/portraits/men/${portraitId}.jpg`;
      console.log(`    🔄 RandomUser fallback: men/${portraitId}`);
    }

    await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [newUrl, p.id]);
    fixed++;
    await delay(200);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 FIX SONUÇLARI`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  ✅ Zaten çalışıyor: ${alreadyOk}`);
  console.log(`  🔧 Düzeltildi:     ${fixed}`);
  console.log(`  📦 Toplam:         ${players.length}`);
  console.log(`${'='.repeat(50)}\n`);

  // Recheck all fixed ones
  console.log(`🔄 Düzeltilenleri tekrar kontrol ediyorum...\n`);

  const [all] = await connection.query("SELECT id, name, faceImageUrl FROM players ORDER BY overall DESC");
  let finalOk = 0;
  let finalBad = 0;

  for (const p of all) {
    try {
      const res = await fetch(p.faceImageUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) finalOk++;
      else { finalBad++; console.log(`  ⚠️ Hala kırık: ${p.name}`); }
    } catch {
      finalBad++;
      console.log(`  ⚠️ Hala kırık: ${p.name}`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`🏁 FİNAL SAYAÇ`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  ✅ Fotoğrafı OLAN:   ${finalOk}`);
  console.log(`  ❌ Fotoğrafı OLMAYAN: ${finalBad}`);
  console.log(`  📦 Toplam:           ${all.length}`);
  console.log(`${'='.repeat(50)}`);

  await connection.end();
}

fixBroken().catch(console.error);
