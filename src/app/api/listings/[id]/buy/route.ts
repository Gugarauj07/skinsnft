import { NextRequest } from "next/server";
import { ensureSeeded, getDb } from "@/server/db";
import { requireUser } from "@/server/auth";
import { appendLedgerEntry } from "@/server/ledger";
import { jsonError, jsonOk } from "../../../_util";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  ensureSeeded();
  let user;
  try {
    user = requireUser(req);
  } catch {
    return jsonError("UNAUTHORIZED", "Faça login", 401);
  }

  const { id } = await ctx.params;
  if (!id) return jsonError("BAD_REQUEST", "id inválido", 400);

  const db = getDb();
  const t = new Date().toISOString();

  try {
    const tx = db.transaction(() => {
      const listing = db
        .prepare(
          `
          SELECT
            l.id AS id,
            l.price AS price,
            l.status AS status,
            l.seller_id AS sellerId,
            s.id AS skinId,
            s.token_id AS tokenId
          FROM listings l
          JOIN skins s ON s.id = l.skin_id
          WHERE l.id = ?
          LIMIT 1
        `,
        )
        .get(id) as
        | { id: string; price: number; status: string; sellerId: string; skinId: string; tokenId: number }
        | undefined;

      if (!listing) throw new Error("NOT_FOUND");
      if (listing.status !== "ACTIVE") throw new Error("NOT_ACTIVE");
      if (listing.sellerId === user.id) throw new Error("CANNOT_BUY_OWN");

      const buyer = db.prepare("SELECT balance FROM users WHERE id=?").get(user.id) as
        | { balance: number }
        | undefined;
      if (!buyer) throw new Error("UNAUTHORIZED");
      if (buyer.balance < listing.price) throw new Error("INSUFFICIENT_FUNDS");

      db.prepare("UPDATE users SET balance = balance - ?, updated_at=? WHERE id=?").run(
        listing.price,
        t,
        user.id,
      );
      db.prepare("UPDATE users SET balance = balance + ?, updated_at=? WHERE id=?").run(
        listing.price,
        t,
        listing.sellerId,
      );

      db.prepare("UPDATE skins SET owner_id=? WHERE id=?").run(user.id, listing.skinId);
      db.prepare("UPDATE listings SET status='SOLD', buyer_id=?, sold_at=? WHERE id=?").run(user.id, t, listing.id);

      appendLedgerEntry("BUY", {
        listingId: listing.id,
        tokenId: listing.tokenId,
        price: listing.price,
        sellerId: listing.sellerId,
        buyerId: user.id,
      });

      return { listingId: listing.id, tokenId: listing.tokenId };
    });

    return jsonOk(tx());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "NOT_FOUND") return jsonError("NOT_FOUND", "Listing não encontrado", 404);
    if (msg === "NOT_ACTIVE") return jsonError("NOT_ACTIVE", "Listing não está ativo", 409);
    if (msg === "CANNOT_BUY_OWN") return jsonError("CANNOT_BUY_OWN", "Você não pode comprar sua própria skin", 400);
    if (msg === "INSUFFICIENT_FUNDS") return jsonError("INSUFFICIENT_FUNDS", "Saldo insuficiente", 400);
    if (msg === "UNAUTHORIZED") return jsonError("UNAUTHORIZED", "Faça login", 401);
    return jsonError("INTERNAL_ERROR", "Erro ao comprar", 500);
  }
}


