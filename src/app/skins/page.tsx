import Link from "next/link";
import { getAllSkins } from "@/server/queries";

export default function SkinsPage() {
  const skins = getAllSkins();
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {skins.map((s) => (
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
                #{String(s.tokenId).padStart(3, "0")} · {s.rarity} · dono: {s.ownerEmail}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}


