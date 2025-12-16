"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Listing = { 
  priceWei: string; 
  priceEth: string;
  sellerAddress: string;
  seller: { id: string; email: string } | null;
} | null;

export function SkinActions(props: {
  tokenId: number;
  isOwner: boolean;
  listing: Listing;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [priceEth, setPriceEth] = useState("0.01");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const canList = props.isLoggedIn && props.isOwner && !props.listing;
  const canCancel = props.isLoggedIn && props.isOwner && !!props.listing;
  const canBuy = props.isLoggedIn && !props.isOwner && !!props.listing;

  const listingLabel = useMemo(() => {
    if (!props.listing) return null;
    const sellerLabel = props.listing.seller?.email || props.listing.sellerAddress.slice(0, 10) + "...";
    return `Preço: ${props.listing.priceEth} ETH · vendedor: ${sellerLabel}`;
  }, [props.listing]);

  async function list() {
    setError(null);
    setTxHash(null);
    setLoading(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokenId: props.tokenId, priceEth }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { txHash?: string }; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Falha ao listar");
        return;
      }
      if (json.data?.txHash) setTxHash(json.data.txHash);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!props.listing) return;
    setError(null);
    setTxHash(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${props.tokenId}/cancel`, { method: "POST" });
      const json = (await res.json()) as { ok: boolean; data?: { txHash?: string }; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Falha ao cancelar");
        return;
      }
      if (json.data?.txHash) setTxHash(json.data.txHash);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function buy() {
    if (!props.listing) return;
    setError(null);
    setTxHash(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${props.tokenId}/buy`, { method: "POST" });
      const json = (await res.json()) as { ok: boolean; data?: { txHash?: string }; error?: { message?: string } };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? "Falha ao comprar");
        return;
      }
      if (json.data?.txHash) setTxHash(json.data.txHash);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
      <div className="text-sm font-medium">Ações</div>
      {props.listing ? (
        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{listingLabel}</div>
      ) : (
        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">Sem listing ativa.</div>
      )}

      {error ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {txHash ? (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300">
          TX: {txHash.slice(0, 20)}...
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {canList ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-zinc-600 dark:text-zinc-300">Preço (ETH)</label>
              <input
                value={priceEth}
                onChange={(e) => setPriceEth(e.target.value)}
                placeholder="0.01"
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-black dark:focus:ring-zinc-100/20"
              />
            </div>
            <button
              disabled={loading}
              onClick={list}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {loading ? "..." : "Listar"}
            </button>
          </div>
        ) : null}

        {canCancel ? (
          <button
            disabled={loading}
            onClick={cancel}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            {loading ? "Processando..." : "Cancelar listing"}
          </button>
        ) : null}

        {canBuy ? (
          <button
            disabled={loading}
            onClick={buy}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Processando..." : `Comprar por ${props.listing?.priceEth} ETH`}
          </button>
        ) : null}

        {!props.isLoggedIn ? (
          <div className="text-xs text-zinc-600 dark:text-zinc-300">Faça login para listar/comprar.</div>
        ) : null}
      </div>
    </div>
  );
}
