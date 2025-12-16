import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getUserWithBalance } from "@/server/auth";
import { getMySkins } from "@/server/queries";
import { weiToEth } from "@/server/blockchain";

export default async function MePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const mePublic = await getUserWithBalance(me);
  const skins = await getMySkins(me.walletAddress);

  const listedCount = skins.filter((s) => s.listingPrice !== null).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Minha conta</h1>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{mePublic.email}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="text-xs text-zinc-500">Saldo ETH</div>
            <div className="font-mono font-semibold">{parseFloat(mePublic.balance).toFixed(4)} ETH</div>
          </div>
          <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="text-xs text-zinc-500">Skins</div>
            <div className="font-semibold">{skins.length}</div>
          </div>
          <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <div className="text-xs text-zinc-500">Listadas</div>
            <div className="font-semibold">{listedCount}</div>
          </div>
        </div>
        <div className="mt-2 font-mono text-xs text-zinc-500 break-all">
          Wallet: {mePublic.walletAddress}
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Minhas skins</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              NFTs que você possui na blockchain.
            </p>
          </div>
          <Link
            href="/skins"
            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            Ver coleção
          </Link>
        </div>

        {skins.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            Você ainda não tem skins.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skins.map((s) => (
              <Link
                key={s.id}
                href={`/skins/${s.tokenId}`}
                className="rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-950"
              >
                <div
                  className="h-44 w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
                  dangerouslySetInnerHTML={{ __html: s.imageSvg }}
                />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300">
                      #{String(s.tokenId).padStart(3, "0")} · {s.rarity}
                    </div>
                  </div>
                  {s.listingPrice ? (
                    <div className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                      {weiToEth(BigInt(s.listingPrice))} ETH
                    </div>
                  ) : (
                    <div className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                      não listada
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
