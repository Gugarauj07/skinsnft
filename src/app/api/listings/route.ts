import { NextRequest } from "next/server";
import { requireUser } from "@/server/auth";
import { listSkinForSale, getOwnerOf, ethToWei, getListingOnChain } from "@/server/blockchain";
import { recordTransaction, getDb } from "@/server/db";
import { getActiveListingsFromChain } from "@/server/queries";
import { jsonError, jsonOk } from "../_util";

export const runtime = "nodejs";

export async function GET() {
  try {
    const listings = await getActiveListingsFromChain();
    return jsonOk({ listings });
  } catch (e) {
    console.error("Error fetching listings:", e);
    return jsonError("INTERNAL_ERROR", "Erro ao buscar listings", 500);
  }
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = requireUser(req);
  } catch {
    return jsonError("UNAUTHORIZED", "Faça login", 401);
  }

  const body = (await req.json()) as { tokenId?: number; priceEth?: string };
  const tokenId = Number(body.tokenId);
  const priceEth = body.priceEth;
  
  if (!Number.isFinite(tokenId) || !priceEth) {
    return jsonError("BAD_REQUEST", "tokenId/preço inválidos", 400);
  }

  const priceNum = parseFloat(priceEth);
  if (priceNum <= 0) {
    return jsonError("BAD_REQUEST", "Preço deve ser maior que 0", 400);
  }

  try {
    const owner = await getOwnerOf(tokenId);
    
    if (!owner || owner.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return jsonError("NOT_OWNER", "Você não é o dono desta skin", 403);
    }

    const existingListing = await getListingOnChain(tokenId);
    if (existingListing?.active) {
      return jsonError("ALREADY_LISTED", "Skin já está listada", 409);
    }

    const priceWei = ethToWei(priceEth);
    const { txHash } = await listSkinForSale(user.privateKey, tokenId, priceWei);

    recordTransaction({
      type: "LIST",
      tokenId,
      fromAddress: user.walletAddress,
      priceWei: priceWei.toString(),
      txHash,
    });

    return jsonOk({ tokenId, priceWei: priceWei.toString(), txHash }, { status: 201 });
  } catch (e) {
    console.error("List error:", e);
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return jsonError("INTERNAL_ERROR", "Erro ao listar: " + msg, 500);
  }
}
