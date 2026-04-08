/**
 * Update player face images using public EA FC CDN
 * Maps known player names to EA FC player IDs and sets faceImageUrl
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// EA FC player face CDN: https://cdn.futwiz.com/assets/img/fc25/faces/{id}.png
// Alternative: https://www.ea.com/ea-sports-fc/ultimate-team/web-app/content/24B23FDE-7835-41C2-87A2-F453DFDB2E82/2024/fut/items/images/mobile/portraits/{id}.png

const FACE_CDN = "https://cdn.futwiz.com/assets/img/fc25/faces";

// Known player ID mappings (EA FC 25 IDs)
const playerFaceIds = {
  "Lionel Messi": 158023,
  "Cristiano Ronaldo": 20801,
  "Kylian Mbappé": 231747,
  "Erling Haaland": 239085,
  "Kevin De Bruyne": 192985,
  "Vinicius Jr": 238794,
  "Jude Bellingham": 243548,
  "Rodri": 231866,
  "Virgil van Dijk": 203376,
  "Mohamed Salah": 209331,
  "Harry Kane": 202126,
  "Luka Modrić": 177003,
  "Robert Lewandowski": 188545,
  "Toni Kroos": 182521,
  "Bukayo Saka": 246669,
  "Bruno Fernandes": 212198,
  "Bernardo Silva": 218667,
  "Phil Foden": 237692,
  "Florian Wirtz": 247034,
  "Lautaro Martínez": 224458,
  "Declan Rice": 234176,
  "Rúben Dias": 239817,
  "Antonio Rüdiger": 205452,
  "Alisson Becker": 212831,
  "Thibaut Courtois": 192119,
  "Manuel Neuer": 167495,
  "Achraf Hakimi": 235212,
  "Trent Alexander-Arnold": 231281,
  "Joško Gvardiol": 247596,
  "William Saliba": 246105,
  "Jamal Musiala": 262914,
  "Pedri": 248566,
  "Gavi": 265836,
  "Federico Valverde": 240130,
  "Eduardo Camavinga": 253998,
  "Aurélien Tchouaméni": 249240,
  "Julián Álvarez": 246191,
  "Rafael Leão": 241721,
  "Khvicha Kvaratskhelia": 256792,
  "Victor Osimhen": 237671,
  "Martin Ødegaard": 222665,
  "Edin Džeko": 167664,
  "Sofyan Amrabat": 229906,
  "Dusan Tadic": 198141,
  "Bright Osayi-Samuel": 237662,
  "İrfan Can Kahveci": 225479,
  "İsmail Yüksek": 262126,
  "Mauro Icardi": 198951,
  "Dries Mertens": 186153,
  "Wilfried Zaha": 197424,
  "Hakim Ziyech": 218667,
  "Fernando Muslera": 168542,
  "Davinson Sánchez": 227594,
  "Lucas Torreira": 224284,
  "Kerem Aktürkoğlu": 252262,
  "Ciro Immobile": 201153,
  "Rafa Silva": 225618,
  "Gedson Fernandes": 243339,
  "Mert Günok": 208613,
  "Uğurcan Çakır": 252049,
  "Enis Bardhi": 233348,
};

async function updatePlayerImages() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("🖼️  Oyuncu resimleri güncelleniyor...\n");

  let updated = 0;
  let notFound = 0;

  for (const [name, eaId] of Object.entries(playerFaceIds)) {
    const faceUrl = `${FACE_CDN}/${eaId}.png`;

    try {
      const [result] = await connection.query(
        "UPDATE players SET faceImageUrl = ? WHERE name = ? AND (faceImageUrl IS NULL OR faceImageUrl = '')",
        [faceUrl, name]
      );
      if (result.affectedRows > 0) {
        updated++;
        console.log(`  ✅ ${name} → ${eaId}.png`);
      } else {
        // Player might not exist or already has image
      }
    } catch (err) {
      console.log(`  ⚠️ ${name}: ${err.message}`);
    }
  }

  // For players without a known EA ID, use ui-avatars as fallback
  const [noImage] = await connection.query(
    "SELECT id, name FROM players WHERE (faceImageUrl IS NULL OR faceImageUrl = '') AND (imageUrl IS NULL OR imageUrl = '')"
  );

  console.log(`\n📷 ${noImage.length} oyuncunun resmi yok, avatar oluşturuluyor...`);

  for (const p of noImage) {
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&size=200&bold=true&format=png`;
    await connection.query("UPDATE players SET faceImageUrl = ? WHERE id = ?", [avatarUrl, p.id]);
  }

  console.log(`\n📊 Sonuç:`);
  console.log(`  EA FC Resimleri: ${updated} oyuncu`);
  console.log(`  Avatar Fallback: ${noImage.length} oyuncu`);
  console.log(`  Toplam: ${updated + noImage.length} güncellendi`);

  await connection.end();
}

updatePlayerImages().catch(console.error);
