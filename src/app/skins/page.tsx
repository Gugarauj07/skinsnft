import Link from "next/link";
import { getAllSkins } from "@/server/queries";
import { getOwnerOf } from "@/server/blockchain";
import { getDb } from "@/server/db";

export default async function SkinsPage() {
  const skins = getAllSkins();
  const db = getDb();

  const skinsWithOwners = await Promise.all(
    skins.map(async (s) => {
      const ownerAddress = await getOwnerOf(s.tokenId);
      let ownerEmail: string | null = null;
      
      if (ownerAddress) {
        const user = db.prepare("SELECT email FROM users WHERE wallet_address = ?").get(ownerAddress) as { email: string } | undefined;
        ownerEmail = user?.email ?? null;
      }
      
      return {
        ...s,
        ownerAddress,
        ownerEmail,
      };
    })
  );

  if (skinsWithOwners.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Skins</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Coleção inicial de 50 skins únicas (SVG + atributos).
            </p>
          </div>
        </div>
        <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
          Nenhuma skin encontrada. Execute o seed: <code className="bg-zinc-100 dark:bg-zinc-900 px-1 rounded">npm run db:seed</code>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Skins</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Coleção inicial de {skinsWithOwners.length} skins únicas (SVG + atributos).
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skinsWithOwners.map((s) => (
          <Link
            key={s.id}
            href={`/skins/${s.tokenId}`}
            className="group rounded-xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-950"
          >
            <div
              className="h-44 w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
              dangerouslySetInnerHTML={{ __html: s.imageSvg }}
            />
            <div className="mt-3">
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                #{String(s.tokenId).padStart(3, "0")} · {s.rarity}
                {s.ownerEmail && ` · dono: ${s.ownerEmail}`}
                {!s.ownerEmail && s.ownerAddress && ` · dono: ${s.ownerAddress.slice(0, 8)}...`}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}


