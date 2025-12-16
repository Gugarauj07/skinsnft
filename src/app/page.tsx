import Link from "next/link";
import { getActiveListingsFromChain } from "@/server/queries";
import { weiToEth } from "@/server/blockchain";

export default async function Home() {
  const listings = await getActiveListingsFromChain();
  
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          NFTs listados na blockchain. Para listar, abra uma skin em{" "}
          <Link href="/skins" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Skins
          </Link>
          .
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
          Nenhuma listing ativa. Faça login e liste uma skin sua.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Link
              key={l.tokenId}
              href={`/skins/${l.tokenId}`}
              className="group rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-950"
            >
              <div
                className="h-44 w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
                dangerouslySetInnerHTML={{ __html: l.imageSvg }}
              />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-300">
                    #{String(l.tokenId).padStart(3, "0")} · {l.rarity} · {l.sellerEmail || l.sellerAddress.slice(0, 10) + "..."}
                  </div>
                </div>
                <div className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {weiToEth(BigInt(l.price))} ETH
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
