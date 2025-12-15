import { NextRequest } from "next/server";
import {
  COOKIE_NAME,
  createSessionForUser,
  createSessionToken,
  sessionCookieOptions,
  verifyLogin,
} from "@/server/auth";
import { ensureSeeded } from "@/server/db";
import { jsonError, jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    ensureSeeded();
    const body = (await req.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) return jsonError("BAD_REQUEST", "email/password obrigatórios", 400);

    const user = verifyLogin({ email: body.email, password: body.password });
    if (!user) return jsonError("INVALID_CREDENTIALS", "Email ou senha inválidos", 401);

    const token = createSessionToken();
    createSessionForUser(user.id, token);

    const res = jsonOk({ user: { id: user.id, email: user.email } });
    res.cookies.set(COOKIE_NAME, token, sessionCookieOptions());
    return res;
  } catch {
    return jsonError("INTERNAL_ERROR", "Erro ao logar", 500);
  }
}


