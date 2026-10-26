import {
  asksFlooding,
  downpourNow,
  itemLngLat,
  mmLabel,
  plural,
  rainNear,
  type GaugeNow,
  type Municipality,
} from "@fala/core";
import { barY, defineChart } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { CloudRain } from "lucide-react";
import { useCallback, useMemo } from "react";
import { EmergencyLines } from "@/components/emergency";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { textLink } from "@/features/landing/bits";
import { listPt } from "@/features/report/report-model";
import { cn } from "@/lib/utils";
import { mapStore, setMapState } from "./map-store";
import { clock, rainNowQuery } from "./rain-query";

/**
 * "Chuva agora" (DECISIONS round 23; BUILD 6.6): while the map shows "Água", the gauges' last hour
 * from the archive, refreshed every 10 minutes, on the map and in this panel. Measured rain, with its
 * source and time; never "alagado agora", and the emergency line always beside it.
 */
/**
 * Hands the readings to the map (the store) once mounted, and takes them back when the panel goes.
 * Keyed by fetch, so each new set of readings mounts it again; the ref is stable, so a re-render
 * (opening a gauge) doesn't.
 */
function SyncGauges({ gauges }: { gauges: GaugeNow[] }) {
  const sync = useCallback(() => {
    setMapState({ gauges });
    return () => setMapState({ gauges: [] });
  }, [gauges]);
  return <span hidden ref={sync} />;
}

/** Heaviest first; silent gauges last. */
const byRain = (a: GaugeNow, b: GaugeNow) =>
  Number(a.stale) - Number(b.stale) || (b.lastHour ?? -1) - (a.lastHour ?? -1) || a.name.localeCompare(b.name);

function useRainNow() {
  const query = useQuery(rainNowQuery);
  const selected = useSelector(mapStore, (s) => s.selectedGauge);
  return { query, selected };
}

function Hours({ gauge, timezone }: { gauge: GaugeNow; timezone: string }) {
  const bars = useMemo(
    () =>
      gauge.hours.map((h) => ({
        hour: `${clock(h.until, timezone).slice(0, 2)}h`,
        mm: h.mm ?? 0,
        known: h.mm !== null,
      })),
    [gauge, timezone],
  );
  const chart = useMemo(
    () =>
      defineChart({
        marks: [barY(bars, { x: "hour", y: "mm", radius: [2, 2, 0, 0], maxThickness: 10 })],
        scales: {
          x: {
            scale: () =>
              scaleBand<string>()
                .domain(bars.map((b) => b.hour))
                .padding(0.25),
            axis: {
              ticks: { values: bars.filter((_, i) => i % 6 === 5).map((b) => b.hour) },
              tickLabels: { thin: true },
            },
          },
          y: { scale: scaleLinear, nice: true, grid: true, axis: { label: "mm" } },
        },
        tooltip,
      }),
    [bars],
  );
  const gaps = bars.filter((b) => !b.known).length;
  return (
    <div className="chart-ink -mx-1">
      <Chart
        definition={chart}
        height={112}
        ariaLabel={`Chuva por hora no pluviômetro ${gauge.name} nas últimas 24 horas`}
      />
      {gaps > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          {gaps === bars.length ? "Sem leituras nas últimas 24 horas." : `${gaps} h sem leitura do pluviômetro.`}
        </p>
      )}
    </div>
  );
}

function GaugeRow({ gauge, open, timezone, page }: { gauge: GaugeNow; open: boolean; timezone: string; page: string }) {
  const silent = gauge.stale || gauge.lastHour === null;
  return (
    <li className={cn("rounded-lg", open && "bg-muted")}>
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => setMapState({ selectedGauge: open ? null : gauge.id })}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{gauge.name}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {gauge.observedAt
              ? `${silent ? "última leitura" : "lido"} às ${clock(gauge.observedAt, timezone)}`
              : "sem leitura"}
          </span>
        </span>
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            silent
              ? "text-muted-foreground"
              : (gauge.lastHour ?? 0) > 0
                ? "font-semibold text-foreground"
                : "text-ink-2",
          )}
        >
          {silent || gauge.lastHour === null ? "—" : mmLabel(gauge.lastHour)}
        </span>
      </button>
      {open && (
        <div className="grid gap-2 px-2 pb-2.5">
          <Hours gauge={gauge} timezone={timezone} />
          <p className="text-xs text-muted-foreground">
            {gauge.day !== null && !silent && <>24 h: {mmLabel(gauge.day)} · </>}
            {gauge.place} ·{" "}
            <a
              className={cn("text-ink-2", textLink)}
              href={page.replace("{id}", String(gauge.id))}
              target="_blank"
              rel="noreferrer"
            >
              Ver no Cemaden
            </a>
          </p>
        </div>
      )}
    </li>
  );
}

/**
 * When a gauge is past the downpour mark: where, and how many flooding records on the map are within
 * reach of it (ringed there). Rain measured near spots that flood; it says nothing of the streets.
 */
function Downpour({ muni, gauges }: { muni: Municipality; gauges: GaugeNow[] }) {
  const visible = useSelector(mapStore, (s) => s.visible);
  const heavy = muni.rain?.heavyMmPerHour;
  if (heavy === undefined) return null;
  const pouring = gauges.filter((g) => downpourNow(g, heavy));
  if (!pouring.length) return null;
  const spots = visible.filter((it) => {
    const p = itemLngLat(it);
    return p && asksFlooding(muni, it.category) && rainNear(p, gauges, { onlyHeavy: heavy });
  }).length;
  return (
    <p className="mx-1 rounded-lg bg-muted px-2.5 py-2 text-sm text-foreground" role="status">
      <b className="font-semibold">Chuva forte agora</b> ({heavy} mm ou mais na última hora) em{" "}
      {listPt(pouring.map((g) => g.name))}.{" "}
      {spots
        ? `${spots} ${plural(spots, "registro", "registros")} de alagamento a até 2 km, com anel no mapa.`
        : "Nenhum registro de alagamento a até 2 km."}
    </p>
  );
}

function Body({ muni }: { muni: Municipality }) {
  const { query, selected } = useRainNow();
  const data = query.data;
  const gauges = data ? data.gauges.toSorted(byRain) : [];
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 px-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <CloudRain className="size-4 text-muted-foreground" aria-hidden="true" />
          Chuva agora
        </h2>
        <span className="text-xs text-muted-foreground">mm na última hora</span>
      </div>
      {data && <Downpour muni={muni} gauges={data.gauges} />}
      {query.isPending ? (
        <p className="px-2 py-3 text-sm text-muted-foreground" role="status">
          Lendo os pluviômetros…
        </p>
      ) : !data ? (
        <p className="px-2 py-3 text-sm text-muted-foreground" role="status">
          Os pluviômetros não responderam agora. Tentamos de novo em alguns minutos.
        </p>
      ) : (
        <ul className="grid gap-0.5" aria-label="Pluviômetros">
          {gauges.map((g) => (
            <GaugeRow key={g.id} gauge={g} open={selected === g.id} timezone={muni.timezone} page={data.page} />
          ))}
        </ul>
      )}
      <div className="grid gap-1 border-t border-hairline px-2 pt-2.5 text-xs text-muted-foreground">
        <p>
          Pluviômetros automáticos do {data?.agency ?? "Cemaden"}, lidos a cada 10 minutos. Sem relatos não é sem
          alagamento.
        </p>
        <p>
          Em emergência: <EmergencyLines muni={muni} />.
        </p>
      </div>
    </>
  );
}

/** Tells the map the view is on while mounted (stable, so it runs once each way). */
const rainViewRef = () => {
  setMapState({ rainView: true });
  return () => setMapState({ rainView: false });
};

/** The readings on the map, for as long as "Água" is on (the panel or the pill is mounted). */
function MapGauges() {
  const query = useQuery(rainNowQuery);
  return (
    <>
      <span hidden ref={rainViewRef} />
      {query.data && <SyncGauges key={query.dataUpdatedAt} gauges={query.data.gauges} />}
    </>
  );
}

/** The panel over the map (desktop), where the legend sits otherwise. */
export function RainPanel({ muni }: { muni: Municipality }) {
  return (
    <section
      aria-label="Chuva agora"
      className="absolute bottom-3.5 left-3.5 z-10 grid w-80 gap-2 rounded-xl border border-hairline bg-card/95 p-2 shadow-soft backdrop-blur-sm @max-4xl:bottom-9 @max-md:hidden"
    >
      <MapGauges />
      <Body muni={muni} />
    </section>
  );
}

/** On a phone: a pill under the filters with the heaviest last hour, opening the same panel. */
export function RainPill({ muni }: { muni: Municipality }) {
  const { data } = useQuery(rainNowQuery);
  const live = (data?.gauges ?? []).filter((g) => !g.stale && g.lastHour !== null);
  const top = Math.max(0, ...live.map((g) => g.lastHour ?? 0));
  const summary = !data || !live.length ? null : top > 0 ? `até ${mmLabel(top)}` : "sem chuva";
  return (
    <>
      <MapGauges />
      <Popover>
        <PopoverTrigger render={<Button variant="floating" size="sm" />}>
          <CloudRain data-icon="inline-start" />
          Chuva agora
          {summary && <span className="font-normal text-muted-foreground tabular-nums">· {summary}</span>}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <div className="-m-2 grid gap-2">
            <Body muni={muni} />
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
