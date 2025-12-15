import { NextRequest } from "next/server";
import { ensureSeeded } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { resetBalances } from "@/server/admin";
import { jsonError, jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  ensureSeeded();
  try {
    requireAdmin(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "UNAUTHORIZED") return jsonError("UNAUTHORIZED", "Faça login", 401);
    return jsonError("FORBIDDEN", "Sem permissão", 403);
  }

  resetBalances({ initialBalance: 1000 });
  return jsonOk({ reset: true });
}


