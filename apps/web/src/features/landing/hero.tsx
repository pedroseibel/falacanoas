import type { Municipality } from "@fala/core";
import { Ban, CodeXml, MessageCircle } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { Fn, Wrap, textLink } from "./bits";
import { bairrosByName, type QueueState } from "./landing-model";
import { QueueMeter } from "./queue-meter";
import { Relief } from "./relief/relief";
import type { Channel } from "./join";

const lift =
  "motion-safe:animate-in motion-safe:slide-in-from-bottom-3 motion-safe:blur-in-2 motion-safe:fill-mode-both motion-safe:duration-1100 motion-safe:ease-fluid";

/** The figure's legend: what each part of the machine stands for, in the product's own rules. */
function Legend({ deadline }: { deadline: number }) {
  const keys = [
    { mark: "bg-foreground", term: "Cada coluna", def: "é um registro: um disco por dia desde o resumo das 18h." },
    { mark: "bg-signal", term: "Em laranja,", def: `os dias que passam do prazo de ${deadline}.` },
    {
      mark: "rounded-full border border-foreground",
      term: "Dois vizinhos",
      def: "confirmam o conserto, e a coluna volta ao chão.",
    },
  ];
  return (
    <dl className="mt-4 grid grid-cols-3 gap-x-6 gap-y-2.5 px-1 text-caption text-muted-foreground max-compact:grid-cols-1">
      {keys.map((k) => (
        <div key={k.term} className="flex items-baseline gap-2.5">
          <i className={cn("size-2 shrink-0 -translate-y-px rounded-xs", k.mark)} aria-hidden="true" />
          <span>
            <dt className="inline font-medium text-foreground">{k.term}</dt> <dd className="inline">{k.def}</dd>
          </span>
        </div>
      ))}
    </dl>
  );
}

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
    <section aria-labelledby="h-hero" className="relative overflow-hidden pt-hero-top pb-section-sm">
      {/* A faint drafting grid behind the figure: the bench it was drawn on. */}
      <div aria-hidden="true" className="bg-draft pointer-events-none absolute inset-0 -z-10" />
      <Wrap>
        <div className="grid grid-cols-hero items-center gap-x-split gap-y-12 max-split:grid-cols-1">
          <div className={lift}>
            <h1 id="h-hero" className="text-display font-semibold text-balance max-split:max-w-headline">
              O que está quebrado na sua rua, contado em dias.
            </h1>
            <p className="mt-6 max-w-lede text-lede text-pretty text-ink-2">
              Vizinhos registram com foto. Às 18h, a lista vai para a Prefeitura e um relógio público começa a contar.
              Ele só para quando quem mora ali confirma o conserto.
            </p>

            <form className="mt-8 flex max-w-130 flex-wrap gap-2.5 max-compact:flex-col" onSubmit={submit} noValidate>
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

            <p className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Ban className="size-4 text-ink-2" aria-hidden="true" />
                Não é um canal da Prefeitura
              </span>
              <span className="inline-flex items-center gap-2">
                <CodeXml className="size-4 text-ink-2" aria-hidden="true" />
                Código aberto, AGPL-3.0
              </span>
            </p>
          </div>

          <div className={cn("delay-150", lift)}>
            <Relief deadline={muni.deadlineDays} />
            <Legend deadline={muni.deadlineDays} />
          </div>
        </div>

        <p className="mt-section-sm max-w-note border-t border-hairline pt-4.5 text-ui text-pretty text-ink-2">
          Em 2024, a Ouvidoria de Canoas recebeu <span className="font-mono text-foreground tabular-nums">2.772</span>{" "}
          manifestações, cerca de <span className="font-mono text-foreground tabular-nums">8</span> para cada mil
          moradores.
          <Fn n={1} />
          <Fn n={2} /> Muita coisa nunca chega lá: vira foto no grupo do bairro, sem data e sem resposta.
        </p>
      </Wrap>
    </section>
  );
}
