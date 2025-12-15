import { randomUUID, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { generateSkin } from "@/lib/generator/skins";

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

export function reseedAll(params: { adminId: string; initialBalance: number; skinsCount: number }) {
  const db = getDb();
  const t = nowIso();

  const tx = db.transaction(() => {
    // wipe marketplace/collection/ledger
    db.prepare("DELETE FROM listings").run();
    db.prepare("DELETE FROM skins").run();
    db.prepare("DELETE FROM ledger_entries").run();
    db.prepare("DELETE FROM sessions").run();

    // reset balances for all users
    db.prepare("UPDATE users SET balance=?, updated_at=?").run(params.initialBalance, t);

    // recreate skins owned by admin
    const insertSkin = db.prepare(
      "INSERT INTO skins (id, token_id, name, rarity, attributes_json, image_svg, owner_id, created_at) VALUES (?,?,?,?,?,?,?,?)",
    );
    for (let tokenId = 1; tokenId <= params.skinsCount; tokenId++) {
      const s = generateSkin(tokenId);
      insertSkin.run(
        randomUUID(),
        s.tokenId,
        s.name,
        s.rarity,
        JSON.stringify(s.attributes),
        s.imageSvg,
        params.adminId,
        t,
      );
    }

    // recreate ledger genesis + mint batch
    const insertLedger = db.prepare(
      "INSERT INTO ledger_entries (id, idx, type, payload_json, prev_hash, hash, created_at) VALUES (?,?,?,?,?,?,?)",
    );
    const genesisPayload = JSON.stringify({ note: "SkinsNFT local ledger genesis", version: 1 });
    const genesisHash = sha256Hex(
      JSON.stringify({ idx: 1, type: "GENESIS", payload_json: genesisPayload, prev_hash: null }),
    );
    insertLedger.run(randomUUID(), 1, "GENESIS", genesisPayload, null, genesisHash, t);

    const mintPayload = JSON.stringify({
      to: params.adminId,
      count: params.skinsCount,
      tokenIds: Array.from({ length: params.skinsCount }, (_, i) => i + 1),
    });
    const mintHash = sha256Hex(
      JSON.stringify({ idx: 2, type: "MINT_BATCH", payload_json: mintPayload, prev_hash: genesisHash }),
    );
    insertLedger.run(randomUUID(), 2, "MINT_BATCH", mintPayload, genesisHash, mintHash, t);
  });

  tx();
}

export function resetBalances(params: { initialBalance: number }) {
  const db = getDb();
  db.prepare("UPDATE users SET balance=?, updated_at=?").run(params.initialBalance, nowIso());
}

export function adjustBalance(params: { email: string; delta: number }) {
  const db = getDb();
  const t = nowIso();
  const row = db.prepare("SELECT id, balance FROM users WHERE email=?").get(params.email) as
    | { id: string; balance: number }
    | undefined;
  if (!row) throw new Error("NOT_FOUND");
  const next = row.balance + params.delta;
  if (next < 0) throw new Error("NEGATIVE");
  db.prepare("UPDATE users SET balance=?, updated_at=? WHERE id=?").run(next, t, row.id);
  return { userId: row.id, balance: next };
}

export function setAdminPassword(params: { adminEmail: string; newPassword: string }) {
  const db = getDb();
  const hash = bcrypt.hashSync(params.newPassword, 10);
  db.prepare("UPDATE users SET password_hash=?, updated_at=? WHERE email=?").run(hash, nowIso(), params.adminEmail);
}


