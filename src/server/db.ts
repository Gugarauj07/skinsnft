import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { generateSkin } from "@/lib/generator/skins";
import { createWallet, mintBatchSkins, getAdminSigner, getNextTokenId } from "./blockchain";

export type Db = Database.Database;

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "dev.db");

let _db: Db | null = null;

function nowIso() {
  return new Date().toISOString();
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
  initialSkins?: number;
};

export async function ensureSeededAsync(opts: SeedOptions = {}) {
  const db = getDb();
  const adminEmail = opts.adminEmail ?? process.env.ADMIN_EMAIL ?? "admin@local";
  const adminPassword = opts.adminPassword ?? process.env.ADMIN_PASSWORD ?? "admin123";
  const initialSkins = opts.initialSkins ?? 50;
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const t = nowIso();

  let adminId: string;
  let adminWalletAddress: string;
  
  const existingAdmin = db
    .prepare("SELECT id, wallet_address FROM users WHERE email = ?")
    .get(adminEmail) as { id: string; wallet_address: string } | undefined;

  if (existingAdmin) {
    adminId = existingAdmin.id;
    adminWalletAddress = existingAdmin.wallet_address;
  } else {
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    
    const adminSigner = getAdminSigner();
    adminWalletAddress = await adminSigner.getAddress();
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || "";

    adminId = randomUUID();
    
    db.prepare(
      "INSERT INTO users (id, email, password_hash, role, wallet_address, wallet_private_key, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
    ).run(adminId, adminEmail, passwordHash, "ADMIN", adminWalletAddress, adminPrivateKey, t, t);
  }

  const dbSkinCount = (db.prepare("SELECT COUNT(*) as c FROM skins").get() as { c: number }).c;

  // Sempre tentamos reconciliar DB <-> chain (seed retomável).
  const chainNext = await getNextTokenId(); // next tokenId to mint (1-based)
  const alreadyMinted = Number(chainNext - 1n);
  const targetTotal = Math.max(initialSkins, alreadyMinted);

  if (dbSkinCount < targetTotal) {
    console.log("Seeding skins (retomável)...");

    const insertSkin = db.prepare(
      "INSERT OR IGNORE INTO skins (id, token_id, name, rarity, attributes_json, image_svg, metadata_uri, tx_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    );
    const insertTx = db.prepare(
      "INSERT INTO transactions (id, type, token_id, from_address, to_address, price_wei, tx_hash, created_at) VALUES (?,?,?,?,?,?,?,?)",
    );

    const ensureSkinRow = (tokenId: number, txHash: string) => {
      const exists = db.prepare("SELECT 1 FROM skins WHERE token_id = ? LIMIT 1").get(tokenId);
      if (exists) return;
      const s = generateSkin(tokenId);
      const metadataUri = `${appBaseUrl}/api/metadata/${tokenId}`;
      insertSkin.run(
        randomUUID(),
        tokenId,
        s.name,
        s.rarity,
        JSON.stringify(s.attributes),
        s.imageSvg,
        metadataUri,
        txHash,
        t,
      );

      // Evitar duplicar transações em re-runs
      const txExists = db
        .prepare("SELECT 1 FROM transactions WHERE type='MINT' AND token_id=? LIMIT 1")
        .get(tokenId);
      if (!txExists) {
        insertTx.run(
          randomUUID(),
          "MINT",
          tokenId,
          "0x0000000000000000000000000000000000000000",
          adminWalletAddress,
          "0",
          txHash,
          t,
        );
      }
    };

    try {
      const BATCH_SIZE = Number(process.env.MINT_BATCH_SIZE ?? "5");

      // 1) Backfill DB para tokens que já existem on-chain
      if (alreadyMinted > 0) {
        console.log(`Backfilling DB for ${alreadyMinted} tokens already minted on-chain...`);
        for (let tokenId = 1; tokenId <= alreadyMinted; tokenId++) {
          ensureSkinRow(tokenId, "on-chain");
        }
      }

      // 2) Mint do que falta na chain até targetTotal
      let mintedTotal = alreadyMinted;
      for (let tokenId = alreadyMinted + 1; tokenId <= targetTotal; tokenId += BATCH_SIZE) {
        const batchTokenIds = Array.from(
          { length: Math.min(BATCH_SIZE, targetTotal - tokenId + 1) },
          (_, i) => tokenId + i,
        );
        const batchUris = batchTokenIds.map((id) => `${appBaseUrl}/api/metadata/${id}`);
        const { tokenIds, txHash } = await mintBatchSkins(adminWalletAddress, batchUris);

        for (const mintedId of tokenIds) {
          ensureSkinRow(Number(mintedId), txHash);
        }

        mintedTotal += tokenIds.length;
        console.log(`Mint batch OK: +${tokenIds.length} (total ${mintedTotal}) tx=${txHash}`);
      }

      console.log(`Seed OK. targetTotal=${targetTotal}`);
    } catch (error) {
      console.error("Failed to mint skins on blockchain:", error);
      throw error;
    }
  }

  return { adminEmail, adminPassword, initialSkins, adminWallet: adminWalletAddress };
}

export function ensureSeeded(opts: SeedOptions = {}) {
  const db = getDb();
  const adminEmail = opts.adminEmail ?? process.env.ADMIN_EMAIL ?? "admin@local";

  const existingAdmin = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(adminEmail) as { id: string } | undefined;

  if (!existingAdmin) {
    console.warn("Database not seeded. Run the seed script first: npm run db:seed");
  }

  return { seeded: !!existingAdmin };
}

export function recordTransaction(data: {
  type: string;
  tokenId?: number;
  fromAddress?: string;
  toAddress?: string;
  priceWei?: string;
  txHash: string;
  blockNumber?: number;
}) {
  const db = getDb();
  const t = nowIso();
  
  db.prepare(
    "INSERT INTO transactions (id, type, token_id, from_address, to_address, price_wei, tx_hash, block_number, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
  ).run(
    randomUUID(),
    data.type,
    data.tokenId ?? null,
    data.fromAddress ?? null,
    data.toAddress ?? null,
    data.priceWei ?? null,
    data.txHash,
    data.blockNumber ?? null,
    t,
  );
}

export function getUserByWallet(walletAddress: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE wallet_address = ?").get(walletAddress) as {
    id: string;
    email: string;
    role: string;
    wallet_address: string;
    wallet_private_key: string;
  } | undefined;
}

export function createUserWithWallet(email: string, passwordHash: string) {
  const db = getDb();
  const wallet = createWallet();
  const t = nowIso();
  const id = randomUUID();
  
  db.prepare(
    "INSERT INTO users (id, email, password_hash, role, wallet_address, wallet_private_key, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
  ).run(id, email, passwordHash, "USER", wallet.address, wallet.privateKey, t, t);
  
  return { id, email, walletAddress: wallet.address, privateKey: wallet.privateKey };
}
