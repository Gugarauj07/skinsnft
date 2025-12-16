import { NextRequest } from "next/server";
import { getDb } from "@/server/db";
import { getOwnerOf, getListingOnChain, weiToEth } from "@/server/blockchain";
import { jsonError, jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ tokenId: string }> }) {
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
        s.metadata_uri AS metadataUri
      FROM skins s
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
        metadataUri: string | null;
      }
    | undefined;

  if (!skin) return jsonError("NOT_FOUND", "Skin não encontrada", 404);

  const ownerAddress = await getOwnerOf(id);
  let ownerUser: { id: string; email: string } | null = null;
  
  if (ownerAddress) {
    const user = db.prepare("SELECT id, email FROM users WHERE wallet_address = ?").get(ownerAddress) as { id: string; email: string } | undefined;
    if (user) ownerUser = user;
  }

  const listing = await getListingOnChain(id);
  let listingData = null;
  
  if (listing?.active) {
    const sellerUser = db.prepare("SELECT id, email FROM users WHERE wallet_address = ?").get(listing.seller) as { id: string; email: string } | undefined;
    listingData = {
      priceWei: listing.price.toString(),
      priceEth: weiToEth(listing.price),
      sellerAddress: listing.seller,
      seller: sellerUser ? { id: sellerUser.id, email: sellerUser.email } : null,
    };
  }

  return jsonOk({
    skin: {
      id: skin.id,
      tokenId: skin.tokenId,
      name: skin.name,
      rarity: skin.rarity,
      attributes: JSON.parse(skin.attributesJson) as unknown,
      imageSvg: skin.imageSvg,
      metadataUri: skin.metadataUri,
      owner: ownerUser 
        ? { id: ownerUser.id, email: ownerUser.email, address: ownerAddress }
        : { address: ownerAddress },
    },
    listing: listingData,
  });
}
