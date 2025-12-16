import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { ethers } from "ethers";
import { getDb } from "./db";
import { generateSkin } from "@/lib/generator/skins";
import { mintBatchSkins, getAdminSigner, getProvider } from "./blockchain";

function nowIso() {
  return new Date().toISOString();
}

export async function reseedSkins(params: { skinsCount: number }) {
  const db = getDb();
  const t = nowIso();
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const adminUser = db.prepare("SELECT wallet_address FROM users WHERE role = 'ADMIN' LIMIT 1").get() as { wallet_address: string } | undefined;
  if (!adminUser) throw new Error("Admin user not found");

  db.prepare("DELETE FROM skins").run();
  db.prepare("DELETE FROM transactions").run();

  console.log("Minting new skins on blockchain...");

  const skinsData: Array<{ name: string; rarity: string; attributes: unknown; imageSvg: string; metadataUri: string }> = [];
  const metadataUris: string[] = [];

  for (let i = 1; i <= params.skinsCount; i++) {
    const s = generateSkin(i);
    const metadataUri = `${appBaseUrl}/api/metadata/${i}`;
    metadataUris.push(metadataUri);
    skinsData.push({ ...s, metadataUri });
  }

  const BATCH_SIZE = Number(process.env.MINT_BATCH_SIZE ?? "5");

  const insertSkin = db.prepare(
    "INSERT INTO skins (id, token_id, name, rarity, attributes_json, image_svg, metadata_uri, tx_hash, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
  );

  const insertTx = db.prepare(
    "INSERT INTO transactions (id, type, token_id, from_address, to_address, price_wei, tx_hash, created_at) VALUES (?,?,?,?,?,?,?,?)",
  );

  let mintedTotal = 0;
  let lastTxHash = "";
  for (let start = 0; start < metadataUris.length; start += BATCH_SIZE) {
    const batchUris = metadataUris.slice(start, start + BATCH_SIZE);
    const batchSkins = skinsData.slice(start, start + BATCH_SIZE);
    const { tokenIds, txHash } = await mintBatchSkins(adminUser.wallet_address, batchUris);
    lastTxHash = txHash;

    for (let i = 0; i < tokenIds.length; i++) {
      const s = batchSkins[i];
      const tokenId = Number(tokenIds[i]);
      insertSkin.run(
        randomUUID(),
        tokenId,
        s.name,
        s.rarity,
        JSON.stringify(s.attributes),
        s.imageSvg,
        s.metadataUri,
        txHash,
        t,
      );

      insertTx.run(
        randomUUID(),
        "MINT",
        tokenId,
        "0x0000000000000000000000000000000000000000",
        adminUser.wallet_address,
        "0",
        txHash,
        t,
      );
    }

    mintedTotal += tokenIds.length;
    console.log(`Mint batch OK: +${tokenIds.length} (total ${mintedTotal}) tx=${txHash}`);
  }

  console.log(`Minted ${mintedTotal} skins total.`);
  return { tokenIds: Array.from({ length: mintedTotal }, (_, i) => i + 1), txHash: lastTxHash };
}

export async function fundUserWallet(params: { walletAddress: string; amountEth: string }) {
  const adminSigner = getAdminSigner();
  const amountWei = ethers.parseEther(params.amountEth);

  const tx = await adminSigner.sendTransaction({
    to: params.walletAddress,
    value: amountWei,
  });

  await tx.wait();
  return { txHash: tx.hash, amountEth: params.amountEth };
}

export async function getNetworkInfo() {
  const provider = getProvider();
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();
  
  return {
    chainId: Number(network.chainId),
    name: network.name,
    blockNumber,
  };
}

export function setAdminPassword(params: { adminEmail: string; newPassword: string }) {
  const db = getDb();
  const hash = bcrypt.hashSync(params.newPassword, 10);
  db.prepare("UPDATE users SET password_hash=?, updated_at=? WHERE email=?").run(hash, nowIso(), params.adminEmail);
}

export function getAllUsers() {
  const db = getDb();
  return db.prepare("SELECT id, email, role, wallet_address, created_at FROM users ORDER BY created_at DESC").all() as {
    id: string;
    email: string;
    role: string;
    wallet_address: string;
    created_at: string;
  }[];
}
