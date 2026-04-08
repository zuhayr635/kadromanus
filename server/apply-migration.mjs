import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to database");

  try {
    // Check current columns
    const [cols] = await connection.query("DESCRIBE players");
    const colNames = cols.map((c) => c.Field);
    console.log("Current columns:", colNames);

    const alterations = [];

    if (!colNames.includes("overall")) {
      // Add new columns
      alterations.push("ADD COLUMN `league` VARCHAR(64) NULL AFTER `team`");
      alterations.push("ADD COLUMN `nation` VARCHAR(64) NULL AFTER `league`");
      alterations.push("ADD COLUMN `overall` INT NULL AFTER `position`");
      alterations.push("ADD COLUMN `pace` INT NULL AFTER `overall`");
      alterations.push("ADD COLUMN `shooting` INT NULL AFTER `pace`");
      alterations.push("ADD COLUMN `passing` INT NULL AFTER `shooting`");
      alterations.push("ADD COLUMN `dribbling` INT NULL AFTER `passing`");
      alterations.push("ADD COLUMN `defending` INT NULL AFTER `dribbling`");
      alterations.push("ADD COLUMN `physical` INT NULL AFTER `defending`");
      alterations.push("ADD COLUMN `diving` INT NULL AFTER `physical`");
      alterations.push("ADD COLUMN `handling` INT NULL AFTER `diving`");
      alterations.push("ADD COLUMN `kicking` INT NULL AFTER `handling`");
      alterations.push("ADD COLUMN `positioningGk` INT NULL AFTER `kicking`");
      alterations.push("ADD COLUMN `reflexes` INT NULL AFTER `positioningGk`");
      alterations.push("ADD COLUMN `faceImageUrl` TEXT NULL AFTER `imageUrl`");
      alterations.push("ADD COLUMN `height` INT NULL AFTER `faceImageUrl`");
      alterations.push("ADD COLUMN `weight` INT NULL AFTER `height`");
      alterations.push("ADD COLUMN `preferredFoot` ENUM('left', 'right') NULL AFTER `weight`");
      alterations.push("ADD COLUMN `weakFoot` INT NULL DEFAULT 3 AFTER `preferredFoot`");
      alterations.push("ADD COLUMN `skillMoves` INT NULL DEFAULT 3 AFTER `weakFoot`");
      alterations.push("ADD COLUMN `marketValue` INT NULL AFTER `skillMoves`");
      alterations.push("ADD COLUMN `cardQuality` ENUM('bronze', 'silver', 'gold', 'elite') NULL AFTER `marketValue`");

      for (const alt of alterations) {
        await connection.query(`ALTER TABLE players ${alt}`);
        console.log(`  + ${alt.split("`")[1] || alt}`);
      }

      // Migrate existing data
      if (colNames.includes("rating")) {
        await connection.query(`
          UPDATE players SET
            overall = rating,
            nation = nationality,
            cardQuality = CASE
              WHEN rating >= 89 THEN 'elite'
              WHEN rating >= 75 THEN 'gold'
              WHEN rating >= 65 THEN 'silver'
              ELSE 'bronze'
            END
          WHERE overall IS NULL
        `);
        console.log("  Migrated existing rating → overall, nationality → nation");
      }

      // Drop old columns
      if (colNames.includes("rating")) {
        await connection.query("ALTER TABLE players DROP COLUMN rating");
        console.log("  Dropped column: rating");
      }
      if (colNames.includes("nationality")) {
        await connection.query("ALTER TABLE players DROP COLUMN nationality");
        console.log("  Dropped column: nationality");
      }

      // Make overall NOT NULL
      await connection.query("ALTER TABLE players MODIFY COLUMN `overall` INT NOT NULL");
      await connection.query("ALTER TABLE players MODIFY COLUMN `cardQuality` ENUM('bronze', 'silver', 'gold', 'elite') NOT NULL");

      console.log("Migration completed successfully!");
    } else {
      console.log("Migration already applied, skipping.");
    }

    // Verify
    const [newCols] = await connection.query("DESCRIBE players");
    console.log("\nNew columns:", newCols.map((c) => c.Field));
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
