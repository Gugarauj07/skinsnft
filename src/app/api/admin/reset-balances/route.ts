import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/auth";
import { getNetworkInfo } from "@/server/admin";
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

  try {
    const networkInfo = await getNetworkInfo();
    return jsonOk({ 
      message: "Com blockchain real, saldos são gerenciados on-chain. Use a rota adjust-balance para enviar ETH.",
      network: networkInfo,
    });
  } catch (e) {
    console.error("Network info error:", e);
    return jsonError("INTERNAL_ERROR", "Erro ao obter informações da rede", 500);
  }
}
