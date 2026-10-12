import type { Municipality } from "@fala/core";
import { Ban, CodeXml, MessageCircle } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Icon, categoryIcon } from "@/components/Icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { HeroMap } from "./bairro-map";
import { Bar, Fn, Num, Panel, Stage, Wrap, textLink } from "./bits";
import { MINI_SCORE, bairrosByName, type QueueState } from "./landing-model";
import { countUpOnView } from "./motion";
import { QueueMeter } from "./queue-meter";
import type { Channel } from "./join";

const count43 = countUpOnView(43);
const lift =
  "motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:blur-in-4 motion-safe:fill-mode-both motion-safe:duration-1200 motion-safe:ease-fluid";

export function Hero({
  muni,
  bairro,
  queue,
  onPick,
  onJoin,
}: {
  muni: Municipality;
  bairro: string;
  queue: QueueState;
  onPick: (slug: string) => void;
  onJoin: (channel: Channel) => void;
}) {
  const select = useRef<HTMLSelectElement>(null);
  const [hint, setHint] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!bairro) {
      setHint("Primeiro, escolha seu bairro.");
      select.current?.focus();
      return;
    }
    onJoin("whatsapp");
  };
  return (
    <section aria-labelledby="h-hero" className="relative pt-hero-top pb-hero-bottom">
      <Wrap>
        <div className="grid grid-cols-2 items-center gap-hero max-split:grid-cols-1">
          <div>
            <h1 id="h-hero" className="text-display font-semibold text-balance max-split:max-w-headline">
              O que está quebrado na sua rua, contado em dias.
            </h1>
            <p className="mt-6.5 max-w-lede text-lede text-pretty text-ink-2">
              Vizinhos registram com foto. Todo dia, a lista vai para a Prefeitura. Um relógio público conta os dias até
              quem mora ali confirmar o conserto.
            </p>

            <form className="mt-8.5 flex max-w-130 flex-wrap gap-2.5 max-compact:flex-col" onSubmit={submit} noValidate>
              <label htmlFor="q-bairro" className="sr-only">
                Seu bairro
              </label>
              <NativeSelect
                ref={select}
                id="q-bairro"
                size="xl"
                required
                className="min-w-0 flex-1 max-compact:w-full"
                value={bairro}
                onChange={(e) => {
                  setHint(null);
                  onPick(e.target.value);
                }}
              >
                <NativeSelectOption value="">Escolha seu bairro</NativeSelectOption>
                {bairrosByName(muni.neighborhoods).map((b) => (
                  <NativeSelectOption key={b.slug} value={b.slug}>
                    {b.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Button type="submit" variant="signal" size="xl" className="max-compact:w-full">
                <MessageCircle />
                Entrar pelo WhatsApp
              </Button>
              <div className="flex basis-full flex-wrap items-baseline justify-between gap-x-4.5 gap-y-1.5 text-sm text-muted-foreground">
                <span aria-live="polite">
                  <QueueMeter state={queue} hint={hint} />
                </span>
                <a
                  href="#entrar"
                  className={cn("text-ink-2", textLink)}
                  onClick={(e) => {
                    e.preventDefault();
                    onJoin("email");
                  }}
                >
                  ou por e-mail
                </a>
              </div>
            </form>

            <p className="mt-7.5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Ban className="size-4 text-ink-2" aria-hidden="true" />
                Não é um canal da Prefeitura
              </span>
              <span className="inline-flex items-center gap-2">
                <CodeXml className="size-4 text-ink-2" aria-hidden="true" />
                Código aberto
              </span>
            </p>
          </div>

          <Stage
            rise={false}
            aria-hidden
            className="aspect-stage rounded-r-none border-r-0 bleed-right max-split:-mr-gutter max-split:aspect-stage-split max-compact:-ml-gutter max-compact:aspect-auto max-compact:h-stage-phone max-compact:rounded-none max-compact:border-l-0"
          >
            <Panel
              className={cn(
                "absolute top-3/50 left-4/25 w-79/100 max-split:left-3/50 max-split:w-9/10 max-compact:top-1/25 max-compact:left-1/25 max-compact:w-23/25",
                lift,
              )}
            >
              <Bar title="Canoas" end={<Badge variant="chip">exemplo</Badge>}>
                <span>18 bairros</span>
                <span className="inline-flex gap-0.5 rounded-lg border border-hairline bg-muted p-0.75">
                  <span className="rounded-md bg-card px-2.25 py-0.75 text-xs text-foreground shadow-soft">
                    Abertos
                  </span>
                  <span className="rounded-md px-2.25 py-0.75 text-xs">Resolvidos</span>
                </span>
              </Bar>
              <div className="px-4.5 pt-3.5 pb-2">
                <HeroMap geo={muni.geo.neighborhoods} />
              </div>
              <div className="flex gap-4 border-t border-hairline px-4.5 pt-2.5 pb-3.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.75">
                  <i className="size-2.25 rounded-full bg-foreground" />
                  aberto
                </span>
                <span className="inline-flex items-center gap-1.75">
                  <i className="size-2.25 rounded-full border border-muted-foreground" />
                  resolvido e confirmado
                </span>
              </div>
            </Panel>

            <Panel
              className={cn(
                "absolute bottom-3/50 left-1/20 z-2 w-21/50 delay-180 max-split:w-2/5 max-compact:bottom-1/25 max-compact:left-1/25 max-compact:w-29/50",
                lift,
              )}
            >
              <div className="relative aspect-4/3 bg-panel-3">
                <picture>
                  <source
                    srcSet="/media/parada-pin-400.webp 400w, /media/parada-pin-800.webp 800w"
                    sizes="(max-width:700px) 56vw, 22vw"
                    type="image/webp"
                  />
                  <img
                    src="/media/parada-pin-400.webp"
                    width={400}
                    height={300}
                    alt=""
                    fetchPriority="low"
                    className="size-full object-cover"
                  />
                </picture>
                <Badge variant="chip" className="absolute top-2.5 left-2.5">
                  exemplo
                </Badge>
              </div>
              <div className="grid gap-3 px-4 pt-3.5 pb-4">
                <div>
                  <p className="flex items-center gap-1.75 text-xs text-muted-foreground">
                    <Icon name={categoryIcon("alaga")} size={14} />
                    Rua que alaga toda chuva · Niterói
                  </p>
                  <p className="text-base leading-snug font-semibold tracking-tight">
                    Parada de ônibus vira poça a cada chuva
                  </p>
                </div>
                <div className="flex items-baseline gap-2 border-t border-hairline pt-2.5">
                  <Num className="text-4xl leading-none font-medium tracking-tighter text-signal-text">
                    <span ref={count43}>43</span>
                  </Num>
                  <span className="text-caption leading-tight text-muted-foreground">
                    dias
                    <br />
                    em aberto
                  </span>
                </div>
                <ul className="grid gap-1.75 text-xs text-muted-foreground">
                  {[
                    ["30 ago", "Registrado por garça-do-sinos"],
                    ["30 ago", "Enviado à Prefeitura, resumo das 18h"],
                    ["hoje", "7 vizinhos também viram"],
                  ].map(([d, t]) => (
                    <li key={t} className="flex items-baseline gap-2">
                      <Num className="w-11 shrink-0 text-ink-2">{d}</Num>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel
              className={cn("absolute top-21/50 -right-px z-3 w-2/5 rounded-r-none delay-320 max-compact:hidden", lift)}
            >
              <Bar title="Placar" end={<Badge variant="chip">exemplo</Badge>}>
                <span>mediana, dias</span>
              </Bar>
              <div className="grid gap-2.75 px-4 pt-1.5 pb-3.5">
                {MINI_SCORE.map((r) => (
                  <div key={r.label} className="grid gap-1.5 text-xs text-ink-2">
                    <span className="flex justify-between gap-2.5">
                      <span>{r.label}</span>
                      <Num className="text-foreground">{r.days}</Num>
                    </span>
                    <span className="h-1 overflow-hidden rounded-xs bg-panel-3">
                      <i
                        className="block h-full rounded-xs bg-foreground"
                        style={{ width: `${Math.round((r.days / 60) * 100)}%` }}
                      />
                    </span>
                  </div>
                ))}
                <p className="text-micro text-muted-foreground">Dados fictícios, só para mostrar o formato.</p>
              </div>
            </Panel>
          </Stage>
        </div>

        <div className="mt-fact grid grid-cols-2 gap-x-hero border-t border-hairline pt-4.5 text-ui text-ink-2 max-split:grid-cols-1">
          <span className="max-split:hidden" />
          <p className="max-w-note text-pretty">
            Em 2024, a Ouvidoria de Canoas recebeu <Num className="text-foreground">2.772</Num> manifestações, cerca de{" "}
            <Num className="text-foreground">8</Num> para cada mil moradores.
            <Fn n={1} />
            <Fn n={2} /> Muita coisa nunca chega lá: vira foto no grupo do bairro, sem data e sem resposta.
          </p>
        </div>
      </Wrap>
    </section>
  );
}
