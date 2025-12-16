import { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { cancelSkinListing, getListingOnChain } from "@/server/blockchain";
import { recordTransaction } from "@/server/db";
import { jsonError, jsonOk } from "../../../_util";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = requireUser(req);
  } catch {
    return jsonError("UNAUTHORIZED", "Faça login", 401);
  }

  const { id } = await ctx.params;
  const tokenId = Number(id);
  
  if (!Number.isFinite(tokenId) || tokenId <= 0) {
    return jsonError("BAD_REQUEST", "tokenId inválido", 400);
  }

  try {
    const listing = await getListingOnChain(tokenId);
    
    if (!listing || !listing.active) {
      return jsonError("NOT_FOUND", "Listing não encontrado ou não está ativo", 404);
    }

    if (listing.seller.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return jsonError("FORBIDDEN", "Você não é o vendedor deste listing", 403);
    }

    const { txHash } = await cancelSkinListing(user.privateKey, tokenId);

    recordTransaction({
      type: "CANCEL_LIST",
      tokenId,
      fromAddress: user.walletAddress,
      txHash,
    });

    return jsonOk({ tokenId, txHash });
  } catch (e) {
    console.error("Cancel listing error:", e);
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return jsonError("INTERNAL_ERROR", "Erro ao cancelar: " + msg, 500);
  }
}
