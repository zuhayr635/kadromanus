/**
 * SCRAPE IMAGES FROM TRANSFERMARKT
 * More reliable for finding player images
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function searchTransfermarkt(playerName, teamName) {
  try {
    // Transfermarkt search URL
    const searchQuery = teamName ? `${playerName} ${teamName}` : playerName;
    const url = `https://www.transfermarkt.com.tr/schnellsuche/ergebnis?query=${encodeURIComponent(searchQuery)}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Parse HTML for player images
    // Transfermarkt uses: <img class="bilderrahmen-fixed" ... data-src="...">
    const imgRegex = /<img[^>]+class="[^"]*bilderrahmen[^"]*"[^>]+data-src="([^"]+)"/gi;
    const matches = [...html.matchAll(imgRegex)];

    if (matches.length > 0) {
      // Get first player image
      let imgSrc = matches[0][1];
      // Convert to higher res if needed
      if (imgSrc.includes('/small/')) {
        imgSrc = imgSrc.replace('/small/', '/medium/');
      } else if (imgSrc.includes('/tiny/')) {
        imgSrc = imgSrc.replace('/tiny/', '/medium/');
      }
      return imgSrc;
    }

    // Alternative: Look for player profile links
    const playerLinkRegex = /<a[^>]+href="\/([^"]+\/profil\/[^"]+)"[^>]*>/gi;
    const playerMatches = [...html.matchAll(playerLinkRegex)];

    if (playerMatches.length > 0) {
      // Construct player image URL from profile path
      const profilePath = playerMatches[0][1];
      // Transfermarkt image pattern: https://img.a.transfermarkt.technology/portrait/{id}_{last3}_{last2}.jpg
      // We'd need to parse the ID, skip for now
    }
  } catch (err) {
    // silent
  }
  return null;
}

async function searchFootballCritic(playerName) {
  try {
    // FootballCritic has a simple API
    const url = `https://api.footballcritic.com/v1/search/searchPlayers/${encodeURIComponent(playerName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.length > 0 && data[0].image) {
      return data[0].image;
    }
  } catch (err) {
    // silent
  }
  return null;
}

async function searchApiFootball(playerName) {
  // Requires API key - skip
  return null;
}

async function fetchRemainingTransfermarkt() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  const [players] = await connection.query(
    `SELECT id, name, team FROM players WHERE faceImageUrl LIKE '%ui-avatars%' OR faceImageUrl IS NULL ORDER BY overall DESC`
  );

  console.log(`\n📷 ${players.length} oyuncu için Transfermarkt araması...\n`);

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    process.stdout.write(`\r  [${i + 1}/${players.length}] ${p.name.padEnd(35)}`);

    let imageUrl = null;

    // Try Transfermarkt
    imageUrl = await searchTransfermarkt(p.name, p.team);
    if (imageUrl) {
      await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
      found++;
      await delay(1000); // Respect rate limits
      continue;
    }

    // Try FootballCritic
    imageUrl = await searchFootballCritic(p.name);
    if (imageUrl) {
      await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [imageUrl, p.id]);
      found++;
      await delay(500);
      continue;
    }

    notFound++;
    await delay(300);
  }

  console.log(`\n\n📊 SONUÇLAR:`);
  console.log(`  ✅ Bulundu: ${found}`);
  console.log(`  ❌ Bulunamadı: ${notFound}`);

  await connection.end();
}

fetchRemainingTransfermarkt().catch(console.error);
