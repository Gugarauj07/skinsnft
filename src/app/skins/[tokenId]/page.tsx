import Link from "next/link";
import { getCurrentUser } from "@/server/auth";
import { getSkinWithListingByTokenId } from "@/server/queries";
import { SkinActions } from "@/components/SkinActions";

export default async function SkinDetailPage(props: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await props.params;
  const id = Number(tokenId);
  const data = Number.isFinite(id) ? getSkinWithListingByTokenId(id) : null;
  if (!data) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
          Skin não encontrada. <Link href="/skins" className="underline">Voltar</Link>
        </div>
      </main>
    );
  }

  const me = await getCurrentUser();
  const isOwner = !!me && me.id === data.skin.owner.id;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-600 dark:text-zinc-300">
            <Link href="/skins" className="underline">
              Skins
            </Link>{" "}
            / #{String(data.skin.tokenId).padStart(3, "0")}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.skin.name}</h1>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {data.skin.rarity} · dono: {data.skin.owner.email}
          </div>
        </div>
        <div className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800">
          Token #{String(data.skin.tokenId).padStart(3, "0")}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
          <div
            className="w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
            dangerouslySetInnerHTML={{ __html: data.skin.imageSvg }}
          />

          <div className="mt-4">
            <div className="text-sm font-medium">Atributos</div>
            <pre className="mt-2 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              {JSON.stringify(data.skin.attributes, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <SkinActions tokenId={data.skin.tokenId} isOwner={isOwner} listing={data.listing} isLoggedIn={!!me} />
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">Dica</div>
            <div className="mt-1">
              Para testar rápido: faça login no admin (<span className="font-mono">admin@local</span> /{" "}
              <span className="font-mono">admin123</span>), liste uma skin, crie outra conta e compre.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


