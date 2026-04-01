import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { giftTiers } from "../drizzle/schema.ts";
import dotenv from "dotenv";

dotenv.config();

// TikTok gift mappings with tier levels and card qualities
const giftMappings = [
  // Tier 1 - Bronze cards (small gifts)
  { giftName: "Rose", giftId: 1, tierLevel: "1", cardQuality: "bronze" },
  { giftName: "Lily", giftId: 2, tierLevel: "1", cardQuality: "bronze" },
  { giftName: "Airplane_Small", giftId: 3, tierLevel: "1", cardQuality: "bronze" },
  { giftName: "Rocket", giftId: 4, tierLevel: "1", cardQuality: "bronze" },
  { giftName: "Heart", giftId: 5, tierLevel: "1", cardQuality: "bronze" },
  { giftName: "Fireworks", giftId: 6, tierLevel: "1", cardQuality: "bronze" },
  { giftName: "Gift Box", giftId: 7, tierLevel: "1", cardQuality: "bronze" },
  { giftName: "Lollipop", giftId: 8, tierLevel: "1", cardQuality: "bronze" },
  { giftName: "Popcorn", giftId: 9, tierLevel: "1", cardQuality: "bronze" },
  { giftName: "Microphone", giftId: 10, tierLevel: "1", cardQuality: "bronze" },
  
  // Tier 2 - Silver cards (medium gifts)
  { giftName: "Diamond", giftId: 11, tierLevel: "2", cardQuality: "silver" },
  { giftName: "Crown", giftId: 12, tierLevel: "2", cardQuality: "silver" },
  { giftName: "Cake", giftId: 13, tierLevel: "2", cardQuality: "silver" },
  { giftName: "Champagne", giftId: 14, tierLevel: "2", cardQuality: "silver" },
  { giftName: "Teddy Bear", giftId: 15, tierLevel: "2", cardQuality: "silver" },
  { giftName: "Panda", giftId: 16, tierLevel: "2", cardQuality: "silver" },
  { giftName: "Unicorn", giftId: 17, tierLevel: "2", cardQuality: "silver" },
  { giftName: "Butterfly", giftId: 18, tierLevel: "2", cardQuality: "silver" },
  { giftName: "Flower", giftId: 19, tierLevel: "2", cardQuality: "silver" },
  { giftName: "Candle", giftId: 20, tierLevel: "2", cardQuality: "silver" },
  
  // Tier 3 - Gold cards (large gifts)
  { giftName: "Lion", giftId: 21, tierLevel: "3", cardQuality: "gold" },
  { giftName: "Tiger", giftId: 22, tierLevel: "3", cardQuality: "gold" },
  { giftName: "Dragon", giftId: 23, tierLevel: "3", cardQuality: "gold" },
  { giftName: "Yacht", giftId: 24, tierLevel: "3", cardQuality: "gold" },
  { giftName: "Airplane_Large", giftId: 25, tierLevel: "3", cardQuality: "gold" },
  { giftName: "Spaceship", giftId: 26, tierLevel: "3", cardQuality: "gold" },
  { giftName: "Castle", giftId: 27, tierLevel: "3", cardQuality: "gold" },
  { giftName: "Treasure Chest", giftId: 28, tierLevel: "3", cardQuality: "gold" },
  { giftName: "Golden Egg", giftId: 29, tierLevel: "3", cardQuality: "gold" },
  { giftName: "Luxury Car", giftId: 30, tierLevel: "3", cardQuality: "gold" },
  
  // Elite tier - Rare/Premium gifts
  { giftName: "Mansion", giftId: 31, tierLevel: "3", cardQuality: "elite" },
  { giftName: "Private Jet", giftId: 32, tierLevel: "3", cardQuality: "elite" },
  { giftName: "Luxury Yacht", giftId: 33, tierLevel: "3", cardQuality: "elite" },
  { giftName: "Diamond Ring", giftId: 34, tierLevel: "3", cardQuality: "elite" },
  { giftName: "Golden Lion", giftId: 35, tierLevel: "3", cardQuality: "elite" },
];

async function seedGiftTiers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);
    
    console.log(`${giftMappings.length} hediye tier eşleşmesi veritabanına ekleniyor...`);
    
    // Insert all gift tiers
    await db.insert(giftTiers).values(giftMappings);
    
    console.log("✅ Hediye tier eşleşmeleri başarıyla eklendi!");
    console.log("\nTier Dağılımı:");
    console.log("- Tier 1 (Bronze): 10 hediye");
    console.log("- Tier 2 (Silver): 10 hediye");
    console.log("- Tier 3 (Gold): 10 hediye");
    console.log("- Elite: 5 hediye");
    
    await connection.end();
  } catch (error) {
    console.error("❌ Seed hatası:", error);
    process.exit(1);
  }
}

seedGiftTiers();
