import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb, createUserWithWallet } from "./db";
import { getBalance, weiToEth } from "./blockchain";

export type AuthUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  walletAddress: string;
  privateKey: string;
};

export type AuthUserPublic = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  walletAddress: string;
  balance: string;
};

export const COOKIE_NAME = "session";
const SESSION_TTL_DAYS = 14;

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function getSessionCookieValueFrom(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

export function getUserBySessionToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const db = getDb();
  const tokenHash = sha256Hex(token);
  const now = new Date().toISOString();
  const row = db
    .prepare(
      `
      SELECT u.id, u.email, u.role, u.wallet_address, u.wallet_private_key
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `,
    )
    .get(tokenHash, now) as {
      id: string;
      email: string;
      role: "USER" | "ADMIN";
      wallet_address: string;
      wallet_private_key: string;
    } | undefined;
  
  if (!row) return null;
  
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    walletAddress: row.wallet_address,
    privateKey: row.wallet_private_key,
  };
}

export async function getUserWithBalance(user: AuthUser): Promise<AuthUserPublic> {
  let balance = "0";
  try {
    const balanceWei = await getBalance(user.walletAddress);
    balance = weiToEth(balanceWei);
  } catch {
    // ignore blockchain errors
  }
  
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    walletAddress: user.walletAddress,
    balance,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value ?? null;
  return getUserBySessionToken(token);
}

export function requireUser(req: NextRequest): AuthUser {
  const token = getSessionCookieValueFrom(req);
  const user = getUserBySessionToken(token);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function requireAdmin(req: NextRequest): AuthUser {
  const user = requireUser(req);
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export function createUser(params: { email: string; password: string }) {
  const email = normalizeEmail(params.email);
  if (!isValidEmail(email)) throw new Error("INVALID_EMAIL");
  if (params.password.length < 6) throw new Error("WEAK_PASSWORD");

  const db = getDb();
  const exists = db.prepare("SELECT 1 FROM users WHERE email=?").get(email);
  if (exists) throw new Error("EMAIL_TAKEN");

  const passwordHash = bcrypt.hashSync(params.password, 10);
  const result = createUserWithWallet(email, passwordHash);

  return { id: result.id, email: result.email, walletAddress: result.walletAddress };
}

export function verifyLogin(params: { email: string; password: string }) {
  const email = normalizeEmail(params.email);
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, password_hash, wallet_address FROM users WHERE email=?")
    .get(email) as { id: string; email: string; password_hash: string; wallet_address: string } | undefined;
  if (!row) return null;
  const ok = bcrypt.compareSync(params.password, row.password_hash);
  if (!ok) return null;
  return { id: row.id, email: row.email, walletAddress: row.wallet_address };
}

export function createSessionForUser(userId: string, token: string) {
  const db = getDb();
  const tokenHash = sha256Hex(token);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?,?,?,?,?)").run(
    cryptoRandomId(),
    userId,
    tokenHash,
    createdAt,
    expiresAt,
  );
  return { expiresAt };
}

export function deleteSessionByToken(token: string | null) {
  if (!token) return;
  const db = getDb();
  const tokenHash = sha256Hex(token);
  db.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash);
}

function cryptoRandomId() {
  return randomBytes(16).toString("hex");
}
