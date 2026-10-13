import type { Municipality } from "@fala/core";
import { HintList } from "./hint-list";
import { findBairro, shownPath } from "./not-found-model";
import { OffMap, type Go } from "./off-map";

/**
 * /bairro/<something that isn't one>, inside the app: what's close ("você quis dizer…"), then every
 * bairro, on the map and as a list.
 */
export function BairroNotFound({ muni, slug, go }: { muni: Municipality; slug: string; go: Go }) {
  const near = findBairro(slug, muni.neighborhoods).near.map((b) => ({
    href: `/bairro/${b.slug}`,
    label: b.name,
    kind: "bairro",
  }));
  const all = muni.neighborhoods.toSorted((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return (
    <div className="mx-auto grid w-full max-w-295 items-start gap-x-split gap-y-8 px-7 pt-10 pb-16 grid-cols-join max-split:grid-cols-1 max-phone:px-4 max-phone:pt-6 max-phone:pb-24">
      <div className="grid content-start gap-7">
        <div className="grid gap-3">
          <h1 className="text-heading font-semibold text-balance">{muni.name} não tem um bairro com esse nome.</h1>
          <p className="text-ui text-pretty text-ink-2">
            O endereço pede{" "}
            <span className="rounded-sm bg-muted px-1 py-0.5 font-mono text-caption">{shownPath(slug, 32)}</span>, que
            não está entre os {muni.neighborhoods.length} bairros oficiais da cidade.
          </p>
        </div>
        <HintList title="Você quis dizer:" hints={near} go={go} />
        <nav aria-label="Todos os bairros" className="grid gap-2.5">
          <p className="text-ui text-ink-2">{near.length ? "Ou escolha outro:" : "Escolha um bairro:"}</p>
          <ul className="flex flex-wrap gap-1.5">
            {all.map((b) => {
              const link = go(`/bairro/${b.slug}`);
              return (
                <li key={b.slug}>
                  <a
                    href={link.href}
                    onClick={link.onClick}
                    className="inline-flex h-8 items-center rounded-full border border-hairline bg-card px-3 text-caption transition-colors duration-200 ease-fluid hover:border-hairline-strong hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-10 pointer-coarse:px-3.5"
                  >
                    {b.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <OffMap
        geo={muni.geo.neighborhoods}
        label={`/bairro/${shownPath(slug, 28)}`}
        bairroHref={(s) => `/bairro/${s}`}
        go={go}
      />
    </div>
  );
}
