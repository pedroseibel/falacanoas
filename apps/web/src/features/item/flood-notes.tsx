import {
  distance,
  floodHistoryLine,
  floodLines,
  freshLine,
  type FreshFlood,
  mmLabel,
  rainLine,
  rainNear,
  type FloodHistory,
  type FloodNotes,
  type LngLat,
  type RainDay,
} from "@fala/core";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import { textLink } from "@/features/landing/bits";
import { clock, rainNowQuery } from "@/features/map/rain-query";

/**
 * A flooding record's water (research/alagamentos): what the reporter saw (core flooding.ts), said as
 * theirs and never as the cause; the day's rain at the nearest gauge (core rain.ts), observed and
 * sourced; the days flooding was registered on this stretch (core flood-history.ts); and, while it
 * rains, the nearest gauge's last hour ("Chuva agora", round 23). Nothing when there's none of them.
 */
export function FloodNotesSection({
  notes,
  rain,
  history,
  live,
  fresh,
  timezone,
}: {
  notes: FloodNotes | undefined;
  rain: RainDay | null | undefined;
  history: FloodHistory | null | undefined;
  /** A flooding record's point: the nearest gauge's rain now shows while it rains. Null otherwise. */
  live: LngLat | null;
  /** Registered, or given a photo, in the last three hours (core flooding.ts). */
  fresh: FreshFlood | null;
  timezone: string;
}) {
  const { data } = useQuery({ ...rainNowQuery, enabled: live !== null });
  const now = live && data ? rainNear(live, data.gauges) : null;
  const lines = notes ? floodLines(notes) : [];
  if (!lines.length && !rain && !history && !now && !fresh) return null;
  const measured = rain ? rainLine(rain, timezone) : null;
  const stretch = history ? floodHistoryLine(history, timezone) : null;
  return (
    <section aria-labelledby="agua" className="grid gap-2.5">
      <h3 id="agua" className="text-sm font-semibold">
        Sobre a água
      </h3>
      {fresh && <p className="text-sm font-medium text-foreground">{freshLine(fresh)}</p>}
      {now && now.gauge.observedAt && now.gauge.lastHour !== null && (
        <p className="flex gap-2 rounded-xl border border-hairline-strong p-3" role="status">
          <CloudRain className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
          <span className="grid min-w-0 gap-1">
            <span className="text-sm text-foreground">
              <b className="font-semibold">Chovendo agora:</b> {mmLabel(now.gauge.lastHour)} na última hora no
              pluviômetro {now.gauge.name}, a {distance(now.meters)}.
            </span>
            <span className="text-xs text-muted-foreground">
              Cemaden, lido às {clock(now.gauge.observedAt, timezone)}. Chuva medida, não um aviso de alagamento.
            </span>
          </span>
        </p>
      )}
      {lines.length > 0 && (
        <div className="grid gap-1.5">
          <p className="text-xs text-muted-foreground">Segundo quem registrou:</p>
          <dl className="grid gap-1.5 text-sm">
            {lines.map((l) => (
              <div key={l.term} className="flex gap-3">
                <dt className="w-20 shrink-0 text-muted-foreground">{l.term}</dt>
                <dd className="min-w-0 text-ink-2">{l.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {rain && measured && (
        <div className="flex gap-2 rounded-xl border border-hairline bg-muted p-3">
          <CloudRain className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="grid min-w-0 gap-1">
            <span className="text-sm text-foreground">{measured.line}</span>
            <span className="text-xs text-muted-foreground">
              {measured.source}{" "}
              <a className={cn("text-ink-2", textLink)} href={rain.page} target="_blank" rel="noreferrer">
                Ver o pluviômetro
              </a>
            </span>
          </p>
        </div>
      )}
      {stretch && (
        <p className="flex gap-2 px-3">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="grid min-w-0 gap-1">
            <span className="text-sm text-ink-2">{stretch.line}</span>
            <span className="text-xs text-muted-foreground">{stretch.note}</span>
          </span>
        </p>
      )}
    </section>
  );
}
