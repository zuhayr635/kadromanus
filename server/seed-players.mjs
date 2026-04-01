import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { players } from "../drizzle/schema.ts";
import dotenv from "dotenv";

dotenv.config();

const playersData = [
  // Fenerbahçe
  { name: "Edin Dzeko", team: "Fenerbahçe", position: "FW", rating: 88, nationality: "Bosnia" },
  { name: "Sofyan Amrabat", team: "Fenerbahçe", position: "CM", rating: 86, nationality: "Morocco" },
  { name: "Jayden Oosterwolde", team: "Fenerbahçe", position: "LB", rating: 80, nationality: "Netherlands" },
  { name: "Serdar Aziz", team: "Fenerbahçe", position: "CB", rating: 82, nationality: "Turkey" },
  { name: "Szalai Attila", team: "Fenerbahçe", position: "CB", rating: 81, nationality: "Hungary" },
  { name: "Bright Osayi-Samuel", team: "Fenerbahçe", position: "RB", rating: 79, nationality: "Nigeria" },
  { name: "İsmail Yüksek", team: "Fenerbahçe", position: "CM", rating: 80, nationality: "Turkey" },
  { name: "Cengiz Ünder", team: "Fenerbahçe", position: "LW", rating: 81, nationality: "Turkey" },
  { name: "Enner Valencia", team: "Fenerbahçe", position: "ST", rating: 82, nationality: "Ecuador" },
  { name: "Dominic Calvert-Lewin", team: "Fenerbahçe", position: "FW", rating: 79, nationality: "England" },
  { name: "Emre Mor", team: "Fenerbahçe", position: "RW", rating: 78, nationality: "Turkey" },
  { name: "Altay Bayındır", team: "Fenerbahçe", position: "GK", rating: 83, nationality: "Turkey" },
  
  // Galatasaray
  { name: "Mauro Icardi", team: "Galatasaray", position: "ST", rating: 87, nationality: "Argentina" },
  { name: "Kerem Aktürkoğlu", team: "Galatasaray", position: "LW", rating: 84, nationality: "Turkey" },
  { name: "Wilfried Zaha", team: "Galatasaray", position: "RW", rating: 85, nationality: "Ivory Coast" },
  { name: "Sergio Oliveira", team: "Galatasaray", position: "CM", rating: 83, nationality: "Portugal" },
  { name: "Davinson Sánchez", team: "Galatasaray", position: "CB", rating: 82, nationality: "Colombia" },
  { name: "Ömer Bayram", team: "Galatasaray", position: "LB", rating: 79, nationality: "Turkey" },
  { name: "Kaan Ayhan", team: "Galatasaray", position: "CB", rating: 80, nationality: "Turkey" },
  { name: "Yusuf Demir", team: "Galatasaray", position: "RB", rating: 77, nationality: "Austria" },
  { name: "Berkan Kutlu", team: "Galatasaray", position: "CM", rating: 76, nationality: "Turkey" },
  { name: "Hakim Ziyech", team: "Galatasaray", position: "AM", rating: 84, nationality: "Morocco" },
  { name: "Muslera Fernando", team: "Galatasaray", position: "GK", rating: 85, nationality: "Uruguay" },
  { name: "Dries Mertens", team: "Galatasaray", position: "FW", rating: 81, nationality: "Belgium" },
  
  // Beşiktaş
  { name: "Ciro Immobile", team: "Beşiktaş", position: "ST", rating: 86, nationality: "Italy" },
  { name: "Jérémie Boga", team: "Beşiktaş", position: "LW", rating: 82, nationality: "Ivory Coast" },
  { name: "Romain Saïss", team: "Beşiktaş", position: "CM", rating: 81, nationality: "Morocco" },
  { name: "Michy Batshuayi", team: "Beşiktaş", position: "FW", rating: 80, nationality: "Belgium" },
  { name: "Valentin Rosier", team: "Beşiktaş", position: "LB", rating: 78, nationality: "France" },
  { name: "Domagoj Bradarić", team: "Beşiktaş", position: "LB", rating: 79, nationality: "Croatia" },
  { name: "Necip Uysal", team: "Beşiktaş", position: "CB", rating: 77, nationality: "Turkey" },
  { name: "Montero Wálter", team: "Beşiktaş", position: "CB", rating: 76, nationality: "Paraguay" },
  { name: "Mert Müldür", team: "Beşiktaş", position: "RB", rating: 78, nationality: "Turkey" },
  { name: "Athanasios Rantos", team: "Beşiktaş", position: "RW", rating: 75, nationality: "Greece" },
  { name: "Oğuzhan Özbayraktar", team: "Beşiktaş", position: "CM", rating: 74, nationality: "Turkey" },
  { name: "Ersin Destanoğlu", team: "Beşiktaş", position: "GK", rating: 81, nationality: "Turkey" },
  
  // Trabzonspor
  { name: "Enis Bardhi", team: "Trabzonspor", position: "CM", rating: 83, nationality: "North Macedonia" },
  { name: "Trezeguet", team: "Trabzonspor", position: "RW", rating: 81, nationality: "Egypt" },
  { name: "Gervinho", team: "Trabzonspor", position: "LW", rating: 80, nationality: "Ivory Coast" },
  { name: "Cornelius Chidera", team: "Trabzonspor", position: "ST", rating: 79, nationality: "Nigeria" },
  { name: "Ahmet Çalık", team: "Trabzonspor", position: "CB", rating: 80, nationality: "Turkey" },
  { name: "Deniz Turuc", team: "Trabzonspor", position: "CB", rating: 77, nationality: "Turkey" },
  { name: "Serkan Asan", team: "Trabzonspor", position: "LB", rating: 76, nationality: "Turkey" },
  { name: "Abdülkadir Ömür", team: "Trabzonspor", position: "CM", rating: 78, nationality: "Turkey" },
  { name: "Romain Saïss", team: "Trabzonspor", position: "CM", rating: 80, nationality: "Morocco" },
  { name: "Vitor Roque", team: "Trabzonspor", position: "FW", rating: 79, nationality: "Brazil" },
  { name: "Doğan Erdoğan", team: "Trabzonspor", position: "RB", rating: 75, nationality: "Turkey" },
  { name: "Uğurcan Çakır", team: "Trabzonspor", position: "GK", rating: 82, nationality: "Turkey" },
];

// Expand dataset to 500+ players
function generateAdditionalPlayers() {
  const teams = ["Fenerbahçe", "Galatasaray", "Beşiktaş", "Trabzonspor", "Sivasspor", "Konyaspor", "Alanyaspor", "Kasımpaşa"];
  const positions = ["GK", "CB", "LB", "RB", "CM", "AM", "LW", "RW", "ST", "FW"];
  const nationalities = ["Turkey", "Brazil", "Argentina", "France", "Germany", "Spain", "Italy", "Portugal", "Netherlands", "Belgium", "England", "Nigeria", "Senegal", "Morocco", "Egypt"];
  
  const allPlayers = [...playersData];
  
  for (let i = playersData.length; i < 550; i++) {
    const firstName = ["Ali", "Mehmet", "Ahmet", "Fatih", "Serkan", "Emre", "Kerem", "Cengiz", "Hakan", "Gökhan", "Arda", "Deniz", "Mert", "Oğuzhan", "Burak"][Math.floor(Math.random() * 15)];
    const lastName = ["Yılmaz", "Demir", "Kaya", "Çetin", "Özdemir", "Şahin", "Kılıç", "Aydın", "Güneş", "Ateş", "Duman", "Aslan", "Kaplan", "Kartal", "Gül"][Math.floor(Math.random() * 15)];
    
    allPlayers.push({
      name: `${firstName} ${lastName}`,
      team: teams[Math.floor(Math.random() * teams.length)],
      position: positions[Math.floor(Math.random() * positions.length)],
      rating: Math.floor(Math.random() * 20) + 65, // 65-85 rating
      nationality: nationalities[Math.floor(Math.random() * nationalities.length)],
    });
  }
  
  return allPlayers;
}

async function seedPlayers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);
    
    const allPlayers = generateAdditionalPlayers();
    
    console.log(`${allPlayers.length} oyuncu veritabanına ekleniyor...`);
    
    // Insert in batches to avoid connection timeout
    const batchSize = 50;
    for (let i = 0; i < allPlayers.length; i += batchSize) {
      const batch = allPlayers.slice(i, i + batchSize);
      await db.insert(players).values(batch);
      console.log(`${Math.min(i + batchSize, allPlayers.length)}/${allPlayers.length} oyuncu eklendi`);
    }
    
    console.log("✅ Oyuncu veritabanı başarıyla dolduruldu!");
    await connection.end();
  } catch (error) {
    console.error("❌ Seed hatası:", error);
    process.exit(1);
  }
}

seedPlayers();
