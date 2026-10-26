import { floodHistoryLine, floodLines, rainLine, type FloodHistory, type FloodNotes, type RainDay } from "@fala/core";
import { CalendarDays, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import { textLink } from "@/features/landing/bits";

/**
 * A flooding record's water (research/alagamentos): what the reporter saw (core flooding.ts), said as
 * theirs and never as the cause; the day's rain at the nearest gauge (core rain.ts), observed and
 * sourced; and the days flooding was registered on this stretch (core flood-history.ts). Nothing when
 * there's none of them.
 */
export function FloodNotesSection({
  notes,
  rain,
  history,
  timezone,
}: {
  notes: FloodNotes | undefined;
  rain: RainDay | null | undefined;
  history: FloodHistory | null | undefined;
  timezone: string;
}) {
  const lines = notes ? floodLines(notes) : [];
  if (!lines.length && !rain && !history) return null;
  const measured = rain ? rainLine(rain, timezone) : null;
  const stretch = history ? floodHistoryLine(history, timezone) : null;
  return (
    <section aria-labelledby="agua" className="grid gap-2.5">
      <h3 id="agua" className="text-sm font-semibold">
        Sobre a água
      </h3>
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
