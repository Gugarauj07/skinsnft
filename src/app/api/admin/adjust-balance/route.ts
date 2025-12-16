import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth";
import { fundUserWallet } from "@/server/admin";
import { getDb } from "@/server/db";
import { jsonError, jsonOk } from "../../_util";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "UNAUTHORIZED") return jsonError("UNAUTHORIZED", "Faça login", 401);
    return jsonError("FORBIDDEN", "Sem permissão", 403);
  }

  const body = (await req.json()) as { email?: string; amountEth?: string };
  const email = body.email?.trim().toLowerCase();
  const amountEth = body.amountEth;
  
  if (!email || !amountEth) {
    return jsonError("BAD_REQUEST", "email/amountEth inválidos", 400);
  }

  const amount = parseFloat(amountEth);
  if (amount <= 0) {
    return jsonError("BAD_REQUEST", "Valor deve ser positivo", 400);
  }

  try {
    const db = getDb();
    const user = db.prepare("SELECT wallet_address FROM users WHERE email = ?").get(email) as { wallet_address: string } | undefined;
    
    if (!user) {
      return jsonError("NOT_FOUND", "Usuário não encontrado", 404);
    }

    const result = await fundUserWallet({ walletAddress: user.wallet_address, amountEth });
    return jsonOk({ 
      funded: true, 
      walletAddress: user.wallet_address,
      amountEth: result.amountEth,
      txHash: result.txHash,
    });
  } catch (e) {
    console.error("Fund error:", e);
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return jsonError("INTERNAL_ERROR", "Erro ao enviar ETH: " + msg, 500);
  }
}
