import { NextRequest } from "next/server";
import { COOKIE_NAME, deleteSessionByToken, getSessionCookieValueFrom } from "@/server/auth";
import { jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = getSessionCookieValueFrom(req);
  deleteSessionByToken(token);
  const res = jsonOk({ loggedOut: true });
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}


