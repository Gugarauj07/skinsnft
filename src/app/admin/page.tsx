"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MeResponse =
  | { ok: true; data: { user: { id: string; email: string; role: "USER" | "ADMIN"; balance: number } | null } }
  | { ok: false; error: { code: string; message?: string } };

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [email, setEmail] = useState("");
  const [delta, setDelta] = useState("100");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setMe(j))
      .catch(() => setMe({ ok: false, error: { code: "NETWORK" } }));
  }, []);

  const user = me && "data" in me ? me.data.user : null;
  const isAdmin = user?.role === "ADMIN";

  async function post(url: string, body?: unknown) {
    setMsg(null);
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        setErr(json.error?.message ?? "Falha");
        return;
      }
      setMsg("OK");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (me && user === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-black">
          Faça login como admin para acessar.
        </div>
      </main>
    );
  }

  if (me && user && !isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-black">
          Acesso negado.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Ferramentas locais para resetar coleção/saldos e ajustar saldo.
      </p>

      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
          <div className="text-sm font-medium">Reseed completo</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            Limpa listings/skins/ledger/sessões, recria 50 skins e reseta saldos para 1000.
          </div>
          <button
            disabled={loading}
            onClick={() => post("/api/admin/reseed")}
            className="mt-3 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Executar reseed
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
          <div className="text-sm font-medium">Reset saldos</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">Define saldo de todos para 1000.</div>
          <button
            disabled={loading}
            onClick={() => post("/api/admin/reset-balances")}
            className="mt-3 rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Resetar
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
          <div className="text-sm font-medium">Ajustar saldo</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-300">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-black dark:focus:ring-zinc-100/20"
                placeholder="user@local"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-600 dark:text-zinc-300">Delta (+/-)</label>
              <input
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-black dark:focus:ring-zinc-100/20"
                placeholder="100"
              />
            </div>
          </div>
          <button
            disabled={loading}
            onClick={() => post("/api/admin/adjust-balance", { email, delta: Number(delta) })}
            className="mt-3 rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Aplicar
          </button>
        </div>

        {msg ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            {msg}
          </div>
        ) : null}
        {err ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {err}
          </div>
        ) : null}
      </div>
    </main>
  );
}


