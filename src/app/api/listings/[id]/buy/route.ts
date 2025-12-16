import { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { buySkin, getListingOnChain, getOwnerOf } from "@/server/blockchain";
import { recordTransaction, getDb } from "@/server/db";
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

    if (listing.seller.toLowerCase() === user.walletAddress.toLowerCase()) {
      return jsonError("CANNOT_BUY_OWN", "Você não pode comprar sua própria skin", 400);
    }

    const owner = await getOwnerOf(tokenId);
    if (!owner || owner.toLowerCase() !== listing.seller.toLowerCase()) {
      return jsonError("INVALID_LISTING", "Vendedor não é mais o dono", 409);
    }

    const { txHash } = await buySkin(user.privateKey, tokenId, listing.price);

    const db = getDb();
    const sellerUser = db.prepare("SELECT id FROM users WHERE wallet_address = ?").get(listing.seller) as { id: string } | undefined;

    recordTransaction({
      type: "BUY",
      tokenId,
      fromAddress: listing.seller,
      toAddress: user.walletAddress,
      priceWei: listing.price.toString(),
      txHash,
    });

    return jsonOk({ 
      tokenId, 
      txHash,
      price: listing.price.toString(),
      seller: listing.seller,
      buyer: user.walletAddress,
    });
  } catch (e) {
    console.error("Buy error:", e);
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    
    if (msg.includes("insufficient funds") || msg.includes("Insufficient")) {
      return jsonError("INSUFFICIENT_FUNDS", "Saldo ETH insuficiente", 400);
    }
    
    return jsonError("INTERNAL_ERROR", "Erro ao comprar: " + msg, 500);
  }
}
