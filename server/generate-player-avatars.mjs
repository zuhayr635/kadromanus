/**
 * Generate beautiful SVG avatars for players without real images
 * Creates unique, colorful player silhouettes based on position and quality
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// Color schemes per card quality
const qualityColors = {
  bronze: { bg: '#8B6914', skin: '#D4A03C', shirt: '#6B4E12' },
  silver: { bg: '#7A8A94', skin: '#C8D4DC', shirt: '#5A6A74' },
  gold:   { bg: '#B8942A', skin: '#F0D858', shirt: '#8A6E10' },
  elite:  { bg: '#7C3AED', skin: '#D8B4FE', shirt: '#5B21B6' },
};

// Generate a deterministic color from name
function hashColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 45%)`;
}

// Generate SVG data URL for a player
function generatePlayerSvg(name, position, cardQuality) {
  const colors = qualityColors[cardQuality] || qualityColors.bronze;
  const jerseyColor = hashColor(name);
  const isGK = position === 'GK';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Jersey number from name hash
  const jerseyNum = (Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % 99) + 1;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260" width="200" height="260">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colors.bg}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${colors.bg}" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="jersey" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${isGK ? '#2dd4bf' : jerseyColor}"/>
      <stop offset="100%" stop-color="${isGK ? '#14b8a6' : jerseyColor}" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="200" height="260" fill="url(#bg)" rx="8"/>
  <!-- Body/Jersey -->
  <path d="M55 260 L55 170 Q55 140 75 130 L100 120 L125 130 Q145 140 145 170 L145 260 Z" fill="url(#jersey)" opacity="0.9"/>
  <!-- Collar -->
  <path d="M85 125 Q100 135 115 125" stroke="white" stroke-width="2" fill="none" opacity="0.5"/>
  <!-- Jersey number -->
  <text x="100" y="210" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="40" font-weight="900" fill="white" opacity="0.35">${jerseyNum}</text>
  <!-- Head -->
  <circle cx="100" cy="85" r="35" fill="${colors.skin}" opacity="0.7"/>
  <!-- Hair -->
  <ellipse cx="100" cy="65" rx="33" ry="20" fill="${colors.bg}" opacity="0.5"/>
  <!-- Face features -->
  <circle cx="88" cy="82" r="2" fill="${colors.bg}" opacity="0.4"/>
  <circle cx="112" cy="82" r="2" fill="${colors.bg}" opacity="0.4"/>
  <!-- Initials on head -->
  <text x="100" y="95" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="white" opacity="0.6">${initials}</text>
  <!-- Shoulder lines -->
  <line x1="55" y1="145" x2="75" y2="135" stroke="white" stroke-width="1.5" opacity="0.2"/>
  <line x1="145" y1="145" x2="125" y2="135" stroke="white" stroke-width="1.5" opacity="0.2"/>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function updateAvatars() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  const [players] = await connection.query(
    "SELECT id, name, position, cardQuality, faceImageUrl FROM players WHERE faceImageUrl LIKE '%ui-avatars.com%'"
  );

  console.log(`🎨 ${players.length} oyuncu için SVG avatar üretiliyor...\n`);

  let count = 0;
  const batchSize = 50;

  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize);
    const updates = batch.map(p => {
      const svgUrl = generatePlayerSvg(p.name, p.position, p.cardQuality);
      return connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [svgUrl, p.id]);
    });
    await Promise.all(updates);
    count += batch.length;
    console.log(`  ⚽ ${count}/${players.length} avatar güncellendi`);
  }

  // Verify
  const [stats] = await connection.query(`
    SELECT
      CASE
        WHEN faceImageUrl LIKE '%futwiz%' OR faceImageUrl LIKE '%ea.com%' THEN 'EA FC'
        WHEN faceImageUrl LIKE '%thesportsdb%' THEN 'TheSportsDB'
        WHEN faceImageUrl LIKE 'data:image/svg%' THEN 'SVG Avatar'
        WHEN faceImageUrl LIKE '%ui-avatars%' THEN 'UI Avatars'
        WHEN faceImageUrl IS NULL OR faceImageUrl = '' THEN 'Yok'
        ELSE 'Diğer'
      END as source,
      COUNT(*) as count
    FROM players
    GROUP BY source
  `);

  console.log('\n📊 Resim Kaynakları:');
  console.table(stats);

  await connection.end();
}

updateAvatars().catch(console.error);
