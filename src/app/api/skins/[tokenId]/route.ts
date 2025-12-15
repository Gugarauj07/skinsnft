import { NextRequest } from "next/server";
import { ensureSeeded, getDb } from "@/server/db";
import { jsonError, jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ tokenId: string }> }) {
  ensureSeeded();
  const { tokenId } = await ctx.params;
  const id = Number(tokenId);
  if (!Number.isFinite(id)) return jsonError("BAD_REQUEST", "tokenId inválido", 400);

  const db = getDb();
  const skin = db
    .prepare(
      `
      SELECT
        s.id AS id,
        s.token_id AS tokenId,
        s.name AS name,
        s.rarity AS rarity,
        s.attributes_json AS attributesJson,
        s.image_svg AS imageSvg,
        s.owner_id AS ownerId,
        u.email AS ownerEmail
      FROM skins s
      JOIN users u ON u.id = s.owner_id
      WHERE s.token_id = ?
      LIMIT 1
    `,
    )
    .get(id) as
    | {
        id: string;
        tokenId: number;
        name: string;
        rarity: string;
        attributesJson: string;
        imageSvg: string;
        ownerId: string;
        ownerEmail: string;
      }
    | undefined;

  if (!skin) return jsonError("NOT_FOUND", "Skin não encontrada", 404);

  const listing = db
    .prepare(
      `
      SELECT
        l.id AS id,
        l.price AS price,
        l.status AS status,
        l.seller_id AS sellerId,
        su.email AS sellerEmail
      FROM listings l
      JOIN users su ON su.id = l.seller_id
      WHERE l.skin_id = ? AND l.status = 'ACTIVE'
      LIMIT 1
    `,
    )
    .get(skin.id) as
    | { id: string; price: number; status: string; sellerId: string; sellerEmail: string }
    | undefined;

  return jsonOk({
    skin: {
      id: skin.id,
      tokenId: skin.tokenId,
      name: skin.name,
      rarity: skin.rarity,
      attributes: JSON.parse(skin.attributesJson) as unknown,
      imageSvg: skin.imageSvg,
      owner: { id: skin.ownerId, email: skin.ownerEmail },
    },
    listing: listing
      ? { id: listing.id, price: listing.price, status: listing.status, seller: { id: listing.sellerId, email: listing.sellerEmail } }
      : null,
  });
}


