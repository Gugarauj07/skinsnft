import { NextRequest } from "next/server";
import {
  COOKIE_NAME,
  createSessionForUser,
  createSessionToken,
  createUser,
  sessionCookieOptions,
} from "@/server/auth";
import { ensureSeeded } from "@/server/db";
import { jsonError, jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    ensureSeeded();
    const body = (await req.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) return jsonError("BAD_REQUEST", "email/password obrigatórios", 400);

    const user = createUser({ email: body.email, password: body.password });
    const token = createSessionToken();
    createSessionForUser(user.id, token);

    const res = jsonOk({ user: { id: user.id, email: user.email } }, { status: 201 });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "EMAIL_TAKEN") return jsonError("EMAIL_TAKEN", "Email já cadastrado", 409);
    if (msg === "INVALID_EMAIL") return jsonError("INVALID_EMAIL", "Email inválido", 400);
    if (msg === "WEAK_PASSWORD") return jsonError("WEAK_PASSWORD", "Senha fraca (mín. 6)", 400);
    return jsonError("INTERNAL_ERROR", "Erro ao cadastrar", 500);
  }
}


