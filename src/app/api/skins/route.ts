import { ensureSeeded, getDb } from "@/server/db";
import { jsonOk } from "../_util";

export const runtime = "nodejs";

export async function GET() {
  ensureSeeded();
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        s.token_id AS tokenId,
        s.name AS name,
        s.rarity AS rarity,
        s.image_svg AS imageSvg,
        u.email AS ownerEmail
      FROM skins s
      JOIN users u ON u.id = s.owner_id
      ORDER BY s.token_id ASC
    `,
    )
    .all() as { tokenId: number; name: string; rarity: string; imageSvg: string; ownerEmail: string }[];

  return jsonOk({ skins: rows });
}


