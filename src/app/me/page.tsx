import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getMyListings, getMySkinsWithActiveListing } from "@/server/queries";
import { MyListingActions } from "@/components/MyListingActions";

export default async function MePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const skins = getMySkinsWithActiveListing(me.id);
  const listings = getMyListings(me.id);

  const activeListings = listings.filter((l) => l.status === "ACTIVE").length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Minha conta</h1>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{me.email}</span> · saldo:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{me.balance}</span> · listings ativas:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{activeListings}</span>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Minhas skins</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Clique em uma skin para ver detalhes e listar.
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
                  {s.listingId ? (
                    <div className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                      {s.listingPrice}
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

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Minhas listings</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Histórico das suas listagens (ativas, vendidas e canceladas).
        </p>

        {listings.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            Você ainda não criou nenhuma listing.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {listings.map((l) => (
              <div
                key={l.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-14 w-14 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
                    dangerouslySetInnerHTML={{ __html: l.imageSvg }}
                  />
                  <div>
                    <Link href={`/skins/${l.tokenId}`} className="text-sm font-medium hover:underline">
                      {l.name}
                    </Link>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300">
                      #{String(l.tokenId).padStart(3, "0")} · {l.rarity} · status:{" "}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{l.status}</span>
                      {l.buyerEmail ? ` · comprador: ${l.buyerEmail}` : ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {l.price}
                  </div>
                  <MyListingActions listingId={l.id} status={l.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}


