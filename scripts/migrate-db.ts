import * as dotenv from "dotenv";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

dotenv.config();

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "dev.db");

function migrate() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("Database doesn't exist yet. It will be created on first run.");
    return;
  }

  console.log("Migrating database schema...");
  const db = new Database(DB_PATH);

  try {
    // Check if wallet_address column exists
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const hasWalletAddress = tableInfo.some((col) => col.name === "wallet_address");

    if (hasWalletAddress) {
      console.log("Database already migrated.");
      db.close();
      return;
    }

    console.log("Backing up old database...");
    const backupPath = DB_PATH + ".backup";
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Backup saved to: ${backupPath}`);

    console.log("Dropping old tables...");
    db.exec(`
      DROP TABLE IF EXISTS listings;
      DROP TABLE IF EXISTS ledger_entries;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS skins;
      DROP TABLE IF EXISTS users;
    `);

    console.log("Creating new schema...");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER',
        wallet_address TEXT NOT NULL UNIQUE,
        wallet_private_key TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

      CREATE TABLE IF NOT EXISTS skins (
        id TEXT PRIMARY KEY,
        token_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        rarity TEXT NOT NULL,
        attributes_json TEXT NOT NULL,
        image_svg TEXT NOT NULL,
        metadata_uri TEXT,
        tx_hash TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS skins_token_id_idx ON skins(token_id);

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        token_id INTEGER,
        from_address TEXT,
        to_address TEXT,
        price_wei TEXT,
        tx_hash TEXT NOT NULL,
        block_number INTEGER,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(type);
      CREATE INDEX IF NOT EXISTS transactions_token_id_idx ON transactions(token_id);
      CREATE INDEX IF NOT EXISTS transactions_tx_hash_idx ON transactions(tx_hash);
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    db.close();
  }
}

migrate();


