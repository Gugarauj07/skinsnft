import * as dotenv from "dotenv";
import { ensureSeededAsync } from "../src/server/db";

dotenv.config();

async function main() {
  console.log("Starting database seed with blockchain integration...\n");

  try {
    const result = await ensureSeededAsync({
      adminEmail: process.env.ADMIN_EMAIL || "admin@local",
      adminPassword: process.env.ADMIN_PASSWORD || "admin123",
      initialSkins: 50,
    });

    console.log("\n=== Seed Complete ===");
    console.log(`Admin Email: ${result.adminEmail}`);
    console.log(`Admin Password: ${result.adminPassword}`);
    console.log(`Admin Wallet: ${result.adminWallet}`);
    console.log(`Initial Skins: ${result.initialSkins}`);
    console.log("\nYou can now login with the admin credentials.");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

main();
