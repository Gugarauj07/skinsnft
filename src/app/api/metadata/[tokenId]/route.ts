import { NextRequest } from "next/server";
import { getDb } from "@/server/db";
import { jsonError, jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await ctx.params;
  const id = Number(tokenId);
  if (!Number.isFinite(id) || id <= 0) return jsonError("BAD_REQUEST", "tokenId inválido", 400);

  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        token_id AS tokenId,
        name,
        rarity,
        attributes_json AS attributesJson,
        image_svg AS imageSvg
      FROM skins
      WHERE token_id = ?
      LIMIT 1
    `,
    )
    .get(id) as
    | { tokenId: number; name: string; rarity: string; attributesJson: string; imageSvg: string }
    | undefined;

  if (!row) return jsonError("NOT_FOUND", "metadata não encontrado", 404);

  const attributesObj = JSON.parse(row.attributesJson) as Record<string, unknown>;

  const metadata = {
    name: row.name,
    description: `Skin ${row.rarity} da coleção SkinsNFT`,
    image: `data:image/svg+xml;base64,${Buffer.from(row.imageSvg).toString("base64")}`,
    attributes: Object.entries(attributesObj).map(([trait_type, value]) => ({ trait_type, value })),
  };

  return jsonOk(metadata);
}


