import * as dotenv from "dotenv";
import { getDb } from "../src/server/db";

dotenv.config();

const db = getDb();

console.log("=== Database Check ===\n");

// Check users
const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
console.log(`Users: ${userCount.c}`);
if (userCount.c > 0) {
  const users = db.prepare("SELECT email, role, wallet_address FROM users LIMIT 5").all();
  console.log("Sample users:", users);
}

// Check skins
const skinCount = db.prepare("SELECT COUNT(*) as c FROM skins").get() as { c: number };
console.log(`\nSkins: ${skinCount.c}`);
if (skinCount.c > 0) {
  const skins = db.prepare("SELECT token_id, name, rarity FROM skins LIMIT 5").all();
  console.log("Sample skins:", skins);
} else {
  console.log("⚠️  No skins found! Run: npm run db:seed");
}

// Check transactions
const txCount = db.prepare("SELECT COUNT(*) as c FROM transactions").get() as { c: number };
console.log(`\nTransactions: ${txCount.c}`);

console.log("\n=== End Check ===");

