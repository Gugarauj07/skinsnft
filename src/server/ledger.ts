import { createHash } from "node:crypto";
import { randomBytes } from "node:crypto";
import { getDb } from "./db";

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function randomId() {
  return randomBytes(16).toString("hex");
}

export function appendLedgerEntry(type: string, payload: unknown) {
  const db = getDb();
  const t = new Date().toISOString();
  const payloadJson = JSON.stringify(payload);

  const last = db
    .prepare("SELECT idx, hash FROM ledger_entries ORDER BY idx DESC LIMIT 1")
    .get() as { idx: number; hash: string } | undefined;

  const idx = (last?.idx ?? 0) + 1;
  const prevHash = last?.hash ?? null;
  const hash = sha256Hex(JSON.stringify({ idx, type, payload_json: payloadJson, prev_hash: prevHash }));

  db.prepare(
    "INSERT INTO ledger_entries (id, idx, type, payload_json, prev_hash, hash, created_at) VALUES (?,?,?,?,?,?,?)",
  ).run(randomId(), idx, type, payloadJson, prevHash, hash, t);

  return { idx, type, payload, prevHash, hash, createdAt: t };
}


