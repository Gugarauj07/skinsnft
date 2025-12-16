import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth";
import { reseedSkins } from "@/server/admin";
import { jsonError, jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "UNAUTHORIZED") return jsonError("UNAUTHORIZED", "Faça login", 401);
    return jsonError("FORBIDDEN", "Sem permissão", 403);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { skinsCount?: number };
    const skinsCount = body.skinsCount ?? 50;

    const result = await reseedSkins({ skinsCount });
    return jsonOk({ 
      reseeded: true, 
      skinsCount: result.tokenIds.length,
      txHash: result.txHash,
    });
  } catch (e) {
    console.error("Reseed error:", e);
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return jsonError("INTERNAL_ERROR", "Erro ao recriar skins: " + msg, 500);
  }
}
