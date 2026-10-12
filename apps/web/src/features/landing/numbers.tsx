import { cn } from "@/lib/utils";
import { Num, Panel, SecHead, Section, Fn, textLink } from "./bits";
import { FLOOD_PERIOD, OUVIDORIA_CHANNELS, OUVIDORIA_TOTAL, fmt, pct, type FloodKey } from "./landing-model";
import { reveal } from "./motion";

/** Ink, then lighter steps of ink; orange only for "open and late" (needs attention). */
const FLOOD_FILL: Record<FloodKey, string> = {
  "in-time": "bg-foreground",
  late: "bg-foreground/55",
  "open-late": "bg-signal",
  open: "bg-foreground/22",
};

export function BleedPhoto() {
  return (
    <figure className="relative m-0">
      <picture>
        <source media="(max-width:900px)" srcSet="/media/parada-wide-1024.webp" type="image/webp" />
        <source srcSet="/media/parada-wide-2048.webp" type="image/webp" />
        <img
          src="/media/parada-wide-1024.webp"
          width={2048}
          height={878}
          alt="Parada de ônibus laranja em Canoas num dia de chuva: calçada de concreto rachada e molhada, rua alagada ao fundo e uma pessoa de guarda-chuva caminhando."
          loading="lazy"
          decoding="async"
          className="block h-bleed w-full object-cover object-bleed"
        />
      </picture>
      <figcaption className="mx-auto flex max-w-wrap flex-wrap justify-between gap-x-8 gap-y-3 px-gutter pt-4 text-caption text-muted-foreground">
        <p className="max-w-note text-ink-2">
          Uma parada de ônibus em Canoas, num dia de chuva. Problemas assim existem em todo bairro. A diferença é ter
          data, lugar e alguém contando.
        </p>
        <span>
          Foto: Nilce Bravo (Bravotata),{" "}
          <a
            className={textLink}
            href="https://commons.wikimedia.org/wiki/File:Aconchegantes_abrigos_%22Parada_F%C3%A1cil%22_Canoas_RS_Brasil_-_panoramio.jpg"
          >
            Wikimedia Commons
          </a>
          ,{" "}
          <a className={textLink} href="https://creativecommons.org/licenses/by-sa/3.0/deed.pt-br">
            CC BY-SA 3.0
          </a>
          , recortada
        </span>
      </figcaption>
    </figure>
  );
}

export function Numbers() {
  const max = Math.max(...OUVIDORIA_CHANNELS.map((c) => c.n));
  return (
    <Section id="numeros">
      <SecHead id="numeros" title="Os números da própria Ouvidoria.">
        A Ouvidoria-Geral do Município publica relatórios todo ano. Eles mostram um canal pouco usado e, no ano da
        enchente, prazos difíceis de cumprir.
      </SecHead>
      <div className="grid grid-cols-pair items-start gap-split max-split:grid-cols-1">
        <div
          ref={reveal}
          className="group/chart transition duration-1100 ease-fluid data-pre:translate-y-5.5 data-pre:blur-xs"
        >
          <Panel className="px-5.5 pt-5.5 pb-4.5">
            <h3 className="flex flex-wrap items-baseline justify-between gap-3 text-body leading-tight font-semibold tracking-tight">
              Manifestações em 2024, por canal{" "}
              <Num className="text-caption font-normal text-muted-foreground">total {fmt(OUVIDORIA_TOTAL)}</Num>
            </h3>
            <ul className="mt-4.5 grid gap-2.5">
              {OUVIDORIA_CHANNELS.map((c, i) => (
                <li key={c.label} className="flex items-center gap-3 text-caption text-ink-2">
                  <span className="w-23 shrink-0 max-compact:w-19.5">{c.label}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-sm bg-panel-3">
                    <i
                      className="block h-full origin-left rounded-sm bg-foreground transition-transform duration-1000 ease-fluid group-data-pre/chart:scale-x-0"
                      style={{ width: `${(c.n / max) * 100}%`, transitionDelay: `${120 + i * 90}ms` }}
                    />
                  </span>
                  <Num className="w-14 shrink-0 text-right text-foreground max-compact:w-12">{fmt(c.n)}</Num>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted-foreground">
              Até 20 de dezembro de 2024. Fonte: Relatório Anual da Ouvidoria 2024.
              <Fn n={1} />
            </p>
          </Panel>
        </div>
        <div ref={reveal} className="transition duration-1100 ease-fluid data-pre:translate-y-5.5 data-pre:blur-xs">
          <Panel className="px-5.5 pt-5.5 pb-4.5">
            <h3 className="flex flex-wrap items-baseline justify-between gap-3 text-body leading-tight font-semibold tracking-tight">
              Período da enchente, 6 mai a 6 dez 2024{" "}
              <Num className="text-caption font-normal text-muted-foreground">1.783 manifestações</Num>
            </h3>
            <div
              role="img"
              aria-label="53,7% respondidas em até 30 dias; 26,1% respondidas fora do prazo; 12,4% em aberto e atrasadas; 7,8% em aberto no prazo."
              className="mt-4.5 flex h-8.5 gap-0.5 overflow-hidden rounded-md"
            >
              {FLOOD_PERIOD.map((s) => (
                <i key={s.key} className={cn("block h-full", FLOOD_FILL[s.key])} style={{ flex: `${s.pct} 0 0` }} />
              ))}
            </div>
            <ul className="mt-3.5 grid grid-cols-2 gap-x-4.5 gap-y-2 text-caption text-ink-2 max-compact:grid-cols-1">
              {FLOOD_PERIOD.map((s) => (
                <li key={s.key} className="flex items-center gap-2.25">
                  <i className={cn("size-2.5 shrink-0 rounded-xs", FLOOD_FILL[s.key])} />
                  <span className="flex-1">{s.label}</span>
                  <Num className="text-foreground">{pct(s.pct)}</Num>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-caption text-ink-2">
              <Num className="text-foreground">30</Num> dias é o prazo da lei para responder uma manifestação,
              prorrogável uma vez por mais <Num className="text-foreground">30</Num>.
              <Fn n={3} />
            </p>
            <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted-foreground">
              Situação na data do relatório. Fonte: Relatório Anual da Ouvidoria 2024, anexo.
              <Fn n={1} />
            </p>
          </Panel>
        </div>
      </div>
      <p className="mt-coda max-w-coda text-coda text-pretty text-foreground">
        Fala, Canoas não substitui a Ouvidoria. Soma a ela um registro público, por bairro, que qualquer pessoa pode
        conferir.
      </p>
    </Section>
  );
}
