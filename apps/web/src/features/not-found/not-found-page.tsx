import { itemPath } from "@fala/core";
import type { Municipality } from "@fala/core";
import { Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HintList } from "./hint-list";
import { pathHints, shownPath } from "./not-found-model";
import type { Go } from "@/components/app-link";
import { OffMap } from "./off-map";
import { StandaloneFrame } from "@/components/page-frame";

/**
 * An address that leads nowhere: the city's map with a dashed pin just outside it, carrying the
 * address. If the address looks like a pin's code or a bairro, the page offers it first.
 */
export function NotFoundPage({ muni, pathname, go }: { muni: Municipality; pathname: string; go: Go }) {
  const hints = pathHints(pathname, muni.neighborhoods).map((h) =>
    h.kind === "pin"
      ? { href: itemPath(h.id), label: h.id, kind: "registro", mono: true }
      : { href: `/bairro/${h.slug}`, label: h.name, kind: "bairro" },
  );
  const map = go("/mapa");
  const home = go("/");
  return (
    <StandaloneFrame go={go}>
      <div className="grid items-center gap-x-split gap-y-10 grid-cols-join max-split:grid-cols-1">
        <div className="grid content-start gap-8">
          <div className="grid gap-3.5">
            <h1 className="text-title font-semibold text-balance">Esta página não está no mapa.</h1>
            <p className="max-w-copy text-lede text-pretty text-ink-2">
              O endereço pode estar incompleto, ou a página mudou de lugar.
            </p>
          </div>
          <HintList title="Talvez você procure:" hints={hints} go={go} />
          <div className="flex flex-wrap gap-3 max-compact:grid">
            <Button
              variant="signal"
              size="xl"
              nativeButton={false}
              render={<a href={map.href} onClick={map.onClick} />}
            >
              <MapIcon aria-hidden="true" />
              Abrir o mapa
            </Button>
            <Button
              variant="outline"
              size="xl"
              nativeButton={false}
              render={<a href={home.href} onClick={home.onClick} />}
            >
              Página inicial
            </Button>
          </div>
        </div>
        <OffMap
          geo={muni.geo.neighborhoods}
          label={shownPath(pathname)}
          bairroHref={(slug) => `/bairro/${slug}`}
          go={go}
        />
      </div>
    </StandaloneFrame>
  );
}
