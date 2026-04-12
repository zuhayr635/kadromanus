import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import path from "path";

export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  try {
    console.log("[DB] Connecting to database...");

    // Parse DATABASE_URL
    const url = new URL(process.env.DATABASE_URL);
    const config = {
      host: url.hostname,
      port: parseInt(url.port || "3306"),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    };

    const connection = await mysql.createConnection(config);
    const db = drizzle(connection);

    console.log("[DB] Running migrations...");
    const migrationsFolder = path.resolve(import.meta.dirname, "..", "drizzle");
    await migrate(db, { migrationsFolder });

    console.log("[DB] ✓ Migrations completed successfully");
    await connection.end();
  } catch (error) {
    console.error("[DB] ✗ Migration failed:", error);
    throw error;
  }
}
