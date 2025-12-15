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

  try {
    const tx = db.transaction(() => {
      const listing = db
        .prepare("SELECT id, status, seller_id AS sellerId FROM listings WHERE id=? LIMIT 1")
        .get(id) as { id: string; status: string; sellerId: string } | undefined;
      if (!listing) throw new Error("NOT_FOUND");
      if (listing.status !== "ACTIVE") throw new Error("NOT_ACTIVE");
      if (listing.sellerId !== user.id) throw new Error("FORBIDDEN");

      db.prepare("UPDATE listings SET status='CANCELLED' WHERE id=?").run(id);
      appendLedgerEntry("CANCEL_LIST", { listingId: id, sellerId: user.id });
      return { listingId: id };
    });

    return jsonOk(tx());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "NOT_FOUND") return jsonError("NOT_FOUND", "Listing não encontrado", 404);
    if (msg === "NOT_ACTIVE") return jsonError("NOT_ACTIVE", "Listing não está ativo", 409);
    if (msg === "FORBIDDEN") return jsonError("FORBIDDEN", "Sem permissão", 403);
    return jsonError("INTERNAL_ERROR", "Erro ao cancelar", 500);
  }
}


