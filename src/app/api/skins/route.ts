import { getDb } from "@/server/db";
import { getOwnerOf } from "@/server/blockchain";
import { jsonOk } from "../_util";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const skins = db
    .prepare(
      `
      SELECT
        s.token_id AS tokenId,
        s.name AS name,
        s.rarity AS rarity,
        s.image_svg AS imageSvg
      FROM skins s
      ORDER BY s.token_id ASC
    `,
    )
    .all() as { tokenId: number; name: string; rarity: string; imageSvg: string }[];

  const skinsWithOwners = await Promise.all(
    skins.map(async (skin) => {
      const ownerAddress = await getOwnerOf(skin.tokenId);
      let ownerEmail: string | null = null;
      
      if (ownerAddress) {
        const user = db.prepare("SELECT email FROM users WHERE wallet_address = ?").get(ownerAddress) as { email: string } | undefined;
        ownerEmail = user?.email ?? null;
      }
      
      return {
        ...skin,
        ownerAddress,
        ownerEmail,
      };
    })
  );

  return jsonOk({ skins: skinsWithOwners });
}
