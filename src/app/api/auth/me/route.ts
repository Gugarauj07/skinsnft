import { NextRequest } from "next/server";
import { getSessionCookieValueFrom, getUserBySessionToken, getUserWithBalance } from "@/server/auth";
import { jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = getSessionCookieValueFrom(req);
  const user = getUserBySessionToken(token);
  
  if (!user) {
    return jsonOk({ user: null });
  }

  const userPublic = await getUserWithBalance(user);
  return jsonOk({ user: userPublic });
}
