import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { generateSkin } from "@/lib/generator/skins";

export type Db = Database.Database;

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "dev.db");

let _db: Db | null = null;

function nowIso() {
  return new Date().toISOString();
}

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function initSchema(db: Db) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      balance INTEGER NOT NULL DEFAULT 1000,
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
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS skins_owner_id_idx ON skins(owner_id);

    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      skin_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      buyer_id TEXT,
      price INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      sold_at TEXT,
      FOREIGN KEY (skin_id) REFERENCES skins(id) ON DELETE CASCADE,
      FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT
    );
    CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
    CREATE INDEX IF NOT EXISTS listings_seller_id_idx ON listings(seller_id);
    CREATE INDEX IF NOT EXISTS listings_buyer_id_idx ON listings(buyer_id);
    CREATE INDEX IF NOT EXISTS listings_skin_id_idx ON listings(skin_id);

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      idx INTEGER NOT NULL UNIQUE,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      prev_hash TEXT,
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ledger_entries_type_idx ON ledger_entries(type);
    CREATE INDEX IF NOT EXISTS ledger_entries_created_at_idx ON ledger_entries(created_at);
  `);
}

export function getDb(): Db {
  if (_db) return _db;
  ensureDir(DB_DIR);
  _db = new Database(DB_PATH);
  initSchema(_db);
  return _db;
}

export type SeedOptions = {
  adminEmail?: string;
  adminPassword?: string;
  initialBalance?: number;
  initialSkins?: number;
};

export function ensureSeeded(opts: SeedOptions = {}) {
  const db = getDb();
  const adminEmail = opts.adminEmail ?? process.env.ADMIN_EMAIL ?? "admin@local";
  const adminPassword = opts.adminPassword ?? process.env.ADMIN_PASSWORD ?? "admin123";
  const initialBalance = opts.initialBalance ?? 1000;
  const initialSkins = opts.initialSkins ?? 50;

  const tx = db.transaction(() => {
    const existingAdmin = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(adminEmail) as { id: string } | undefined;

    const passwordHash = bcrypt.hashSync(adminPassword, 10);

    let adminId: string;
    if (existingAdmin) {
      adminId = existingAdmin.id;
      db.prepare(
        "UPDATE users SET role='ADMIN', password_hash=?, balance=?, updated_at=? WHERE id=?",
      ).run(passwordHash, initialBalance, nowIso(), adminId);
    } else {
      adminId = randomUUID();
      const t = nowIso();
      db.prepare(
        "INSERT INTO users (id, email, password_hash, role, balance, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
      ).run(adminId, adminEmail, passwordHash, "ADMIN", initialBalance, t, t);
    }

    const skinCount = (db.prepare("SELECT COUNT(*) as c FROM skins").get() as { c: number }).c;
    if (skinCount === 0) {
      const insertSkin = db.prepare(
        "INSERT INTO skins (id, token_id, name, rarity, attributes_json, image_svg, owner_id, created_at) VALUES (?,?,?,?,?,?,?,?)",
      );
      const t = nowIso();
      for (let tokenId = 1; tokenId <= initialSkins; tokenId++) {
        const s = generateSkin(tokenId);
        insertSkin.run(
          randomUUID(),
          s.tokenId,
          s.name,
          s.rarity,
          JSON.stringify(s.attributes),
          s.imageSvg,
          adminId,
          t,
        );
      }

      const ledgerCount = (db
        .prepare("SELECT COUNT(*) as c FROM ledger_entries")
        .get() as { c: number }).c;
      if (ledgerCount === 0) {
        const insertLedger = db.prepare(
          "INSERT INTO ledger_entries (id, idx, type, payload_json, prev_hash, hash, created_at) VALUES (?,?,?,?,?,?,?)",
        );

        const genesisPayload = JSON.stringify({ note: "SkinsNFT local ledger genesis", version: 1 });
        const genesisHash = sha256Hex(
          JSON.stringify({ idx: 1, type: "GENESIS", payload_json: genesisPayload, prev_hash: null }),
        );
        insertLedger.run(randomUUID(), 1, "GENESIS", genesisPayload, null, genesisHash, t);

        const mintPayload = JSON.stringify({
          to: adminId,
          count: initialSkins,
          tokenIds: Array.from({ length: initialSkins }, (_, i) => i + 1),
        });
        const mintHash = sha256Hex(
          JSON.stringify({ idx: 2, type: "MINT_BATCH", payload_json: mintPayload, prev_hash: genesisHash }),
        );
        insertLedger.run(randomUUID(), 2, "MINT_BATCH", mintPayload, genesisHash, mintHash, t);
      }
    }

    return { adminEmail, adminPassword, initialBalance, initialSkins };
  });

  return tx();
}


