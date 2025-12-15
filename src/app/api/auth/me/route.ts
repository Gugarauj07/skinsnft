import { NextRequest } from "next/server";
import { getSessionCookieValueFrom, getUserBySessionToken } from "@/server/auth";
import { ensureSeeded } from "@/server/db";
import { jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  ensureSeeded();
  const token = getSessionCookieValueFrom(req);
  const user = getUserBySessionToken(token);
  return jsonOk({ user });
}


