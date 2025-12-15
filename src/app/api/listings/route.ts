import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { ensureSeeded, getDb } from "@/server/db";
import { requireUser } from "@/server/auth";
import { appendLedgerEntry } from "@/server/ledger";
import { jsonError, jsonOk } from "../_util";

export const runtime = "nodejs";

function randomId() {
  return randomBytes(16).toString("hex");
}

export async function GET() {
  ensureSeeded();
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        l.id AS id,
        l.price AS price,
        l.created_at AS createdAt,
        s.token_id AS tokenId,
        s.name AS name,
        s.rarity AS rarity,
        s.image_svg AS imageSvg,
        su.email AS sellerEmail
      FROM listings l
      JOIN skins s ON s.id = l.skin_id
      JOIN users su ON su.id = l.seller_id
      WHERE l.status = 'ACTIVE'
      ORDER BY l.created_at DESC
    `,
    )
    .all() as {
    id: string;
    price: number;
    createdAt: string;
    tokenId: number;
    name: string;
    rarity: string;
    imageSvg: string;
    sellerEmail: string;
  }[];

  return jsonOk({ listings: rows });
}

export async function POST(req: NextRequest) {
  ensureSeeded();
  let user;
  try {
    user = requireUser(req);
  } catch {
    return jsonError("UNAUTHORIZED", "Faça login", 401);
  }

  const body = (await req.json()) as { tokenId?: number; price?: number };
  const tokenId = Number(body.tokenId);
  const price = Number(body.price);
  if (!Number.isFinite(tokenId) || !Number.isFinite(price) || price <= 0) {
    return jsonError("BAD_REQUEST", "tokenId/preço inválidos", 400);
  }

  const db = getDb();
  const t = new Date().toISOString();

  try {
    const tx = db.transaction(() => {
      const skin = db
        .prepare("SELECT id, owner_id FROM skins WHERE token_id = ? LIMIT 1")
        .get(tokenId) as { id: string; owner_id: string } | undefined;
      if (!skin) throw new Error("NOT_FOUND");
      if (skin.owner_id !== user.id) throw new Error("NOT_OWNER");

      const existing = db
        .prepare("SELECT 1 FROM listings WHERE skin_id=? AND status='ACTIVE' LIMIT 1")
        .get(skin.id);
      if (existing) throw new Error("ALREADY_LISTED");

      const listingId = randomId();
      db.prepare(
        "INSERT INTO listings (id, skin_id, seller_id, buyer_id, price, status, created_at, sold_at) VALUES (?,?,?,?,?,?,?,?)",
      ).run(listingId, skin.id, user.id, null, price, "ACTIVE", t, null);

      appendLedgerEntry("LIST", { listingId, tokenId, price, sellerId: user.id });

      return listingId;
    });

    const listingId = tx();
    return jsonOk({ listingId }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "NOT_FOUND") return jsonError("NOT_FOUND", "Skin não encontrada", 404);
    if (msg === "NOT_OWNER") return jsonError("NOT_OWNER", "Você não é o dono", 403);
    if (msg === "ALREADY_LISTED") return jsonError("ALREADY_LISTED", "Já está listada", 409);
    return jsonError("INTERNAL_ERROR", "Erro ao listar", 500);
  }
}


