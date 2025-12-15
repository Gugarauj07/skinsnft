import { NextRequest } from "next/server";
import { ensureSeeded } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { adjustBalance } from "@/server/admin";
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

  const body = (await req.json()) as { email?: string; delta?: number };
  const email = body.email?.trim().toLowerCase();
  const delta = Number(body.delta);
  if (!email || !Number.isFinite(delta)) return jsonError("BAD_REQUEST", "email/delta inválidos", 400);

  try {
    const result = adjustBalance({ email, delta });
    return jsonOk(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "NOT_FOUND") return jsonError("NOT_FOUND", "Usuário não encontrado", 404);
    if (msg === "NEGATIVE") return jsonError("NEGATIVE", "Saldo não pode ficar negativo", 400);
    return jsonError("INTERNAL_ERROR", "Erro ao ajustar saldo", 500);
  }
}


