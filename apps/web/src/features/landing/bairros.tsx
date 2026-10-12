import type { Municipality } from "@fala/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PickMap } from "./bairro-map";
import { Bar, Fn, Panel, SecHead, Section, Stage } from "./bits";
import { bairrosByQueue, fmt, litSlots, plural, queueState } from "./landing-model";
import { reveal } from "./motion";

const SLOTS = Array.from({ length: 20 }, (_, i) => i);

export function Bairros({
  muni,
  confirmed,
  live,
  selected,
  onPick,
}: {
  muni: Municipality;
  confirmed: Record<string, number>;
  live: boolean;
  selected: string;
  onPick: (slug: string) => void;
}) {
  const total = Object.values(confirmed).reduce((a, b) => a + b, 0);
  const describe = (slug: string) => {
    const q = queueState(
      muni.neighborhoods.find((n) => n.slug === slug),
      confirmed,
    );
    if (q.kind === "withFirst") return "abre com o 1º bairro";
    if (q.kind === "full") return "fila cheia";
    return q.kind === "missing" ? `faltam ${fmt(q.missing)}` : "";
  };
  return (
    <Section id="bairros" divided>
      <SecHead id="bairros" title="Cada bairro abre quando a fila enche.">
        Cerca de 1 inscrito para cada 300 moradores, com mínimo de 25.
        <Fn n={4} /> Industrial, Brigadeira e Ilha das Garças, que têm poucos moradores, abrem junto com o primeiro
        bairro que encher.
      </SecHead>
      <div className="grid grid-cols-lead items-start gap-card max-split:grid-cols-1">
        <Stage className="p-card split:sticky split:top-23">
          <Panel className="overflow-visible">
            <Bar title="Fila por bairro">
              <span>
                {total
                  ? `${fmt(total)} ${plural(total, "inscrito confirmado", "inscritos confirmados")}`
                  : "sem inscritos ainda"}
              </span>
            </Bar>
            <PickMap
              geo={muni.geo.neighborhoods}
              selected={selected}
              describe={describe}
              label={`Mapa dos ${muni.neighborhoods.length} bairros de ${muni.name}. Escolha um bairro.`}
              onPick={onPick}
            />
          </Panel>
        </Stage>
        <div ref={reveal} className="transition duration-1100 ease-fluid data-pre:translate-y-5.5 data-pre:blur-xs">
          <Panel>
            <Bar title="Quanto falta" end={live ? <Badge variant="chip">ao vivo</Badge> : undefined} />
            <ul className="py-1.5">
              {bairrosByQueue(muni.neighborhoods).map((b) => {
                const n = confirmed[b.slug] ?? 0;
                const lit = litSlots(b.threshold, n);
                const on = b.slug === selected;
                return (
                  <li key={b.slug} className="border-t border-hairline first:border-t-0">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onPick(b.slug)}
                      className={cn(
                        "flex w-full cursor-pointer flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5 px-4.5 py-2.75 text-left outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-inset",
                        on ? "bg-signal-wash" : "hover:bg-muted",
                      )}
                    >
                      <span className="text-ui font-medium">{b.name}</span>
                      <span
                        className={cn(
                          "text-right font-mono text-xs tabular-nums",
                          on ? "text-signal-text" : "text-muted-foreground",
                        )}
                      >
                        {b.threshold ? `${fmt(n)} de ${fmt(b.threshold)}` : "abre com o 1º bairro"}
                      </span>
                      <span aria-hidden="true" className="grid basis-full grid-cols-20 gap-0.75">
                        {SLOTS.map((i) => (
                          <i
                            key={i}
                            className={cn(
                              "h-3 rounded-xs",
                              i < lit ? (on ? "bg-signal" : "bg-foreground") : "bg-panel-3",
                            )}
                          />
                        ))}
                      </span>
                      {!b.threshold && (
                        <span className="basis-full text-xs text-muted-foreground">
                          Poucos moradores: abre junto com o primeiro bairro que encher.
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-hairline px-4.5 py-3.5 text-xs leading-normal text-muted-foreground">
              Só contam inscrições confirmadas pelo WhatsApp ou pelo link do e-mail.
            </p>
          </Panel>
        </div>
      </div>
    </Section>
  );
}
