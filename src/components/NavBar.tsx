"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeResponse =
  | { ok: true; data: { user: { id: string; email: string; role: "USER" | "ADMIN"; balance: number } | null } }
  | { ok: false; error: { code: string; message?: string } };

export function NavBar() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMe(j))
      .catch(() => setMe({ ok: false, error: { code: "NETWORK" } }));
  }, []);

  const user = me && "data" in me ? me.data.user : null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    setMe({ ok: true, data: { user: null } });
  }

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-5">
          <Link href="/" className="font-semibold tracking-tight">
            SkinsNFT (local)
          </Link>
          <nav className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
            <Link href="/" className="hover:text-zinc-950 dark:hover:text-white">
              Marketplace
            </Link>
            <Link href="/skins" className="hover:text-zinc-950 dark:hover:text-white">
              Skins
            </Link>
            {user ? (
              <Link href="/me" className="hover:text-zinc-950 dark:hover:text-white">
                Minha conta
              </Link>
            ) : null}
            {user?.role === "ADMIN" ? (
              <Link href="/admin" className="hover:text-zinc-950 dark:hover:text-white">
                Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden text-zinc-600 dark:text-zinc-300 sm:inline">
                {user.email} · <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.balance}</span>
              </span>
              {user.role === "ADMIN" ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  ADMIN
                </span>
              ) : null}
              <button
                onClick={logout}
                className="rounded-md border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}


