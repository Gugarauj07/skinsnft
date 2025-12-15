"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MyListingActions(props: { listingId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const canCancel = props.status === "ACTIVE";

  async function cancel() {
    setLoading(true);
    try {
      await fetch(`/api/listings/${props.listingId}/cancel`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!canCancel) return null;

  return (
    <button
      disabled={loading}
      onClick={cancel}
      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      {loading ? "Cancelando..." : "Cancelar"}
    </button>
  );
}


