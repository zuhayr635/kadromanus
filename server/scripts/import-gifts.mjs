import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { giftTiers } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

function autoMapQuality(diamondCost) {
  if (diamondCost >= 1000) return "elite";
  if (diamondCost >= 100) return "gold";
  if (diamondCost >= 10) return "silver";
  return "bronze";
}

function autoMapTier(diamondCost) {
  if (diamondCost >= 100) return "3";
  if (diamondCost >= 10) return "2";
  return "1";
}

async function importGifts() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    const raw = fs.readFileSync("gifts-db.json", "utf-8");
    const giftsObj = JSON.parse(raw);
    const gifts = Object.values(giftsObj);

    console.log(`Toplam ${gifts.length} hediye bulundu`);

    // Filter out empty names
    const validGifts = gifts.filter(g => g.name && g.name.trim().length > 0);
    console.log(`Geçerli hediye sayısı: ${validGifts.length} (${gifts.length - validGifts.length} boş isim filtrelendi)`);

    let imported = 0;
    let skipped = 0;

    for (const gift of validGifts) {
      const existing = await db.select().from(giftTiers).where(eq(giftTiers.giftId, gift.id)).limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(giftTiers).values({
        giftName: gift.name,
        giftId: gift.id,
        image: gift.image || null,
        diamondCost: gift.diamondCost || 0,
        tierLevel: autoMapTier(gift.diamondCost || 0),
        cardQuality: autoMapQuality(gift.diamondCost || 0),
      });

      imported++;
      if (imported % 50 === 0) {
        console.log(`İlerleme: ${imported}/${validGifts.length}`);
      }
    }

    console.log(`\n✅ Import tamamlandı!`);
    console.log(`- İçe aktarılan: ${imported}`);
    console.log(`- Atlanan (zaten var): ${skipped}`);

    await connection.end();
  } catch (error) {
    console.error("❌ Import hatası:", error);
    process.exit(1);
  }
}

importGifts();
