import { z } from "zod";
import type { LngLat } from "./types";

/**
 * Rain, as the gauges in the municipality measured it (research/alagamentos): observed, sourced, and
 * never a forecast or a risk. Cemaden publishes its automatic gauges' accumulations live, but keeps
 * no public history (that needs a login and an approved request at PED), so the instance archives the
 * live feed: what isn't logged as it happens is lost. Plain functions over the feed's JSON; the
 * digest service fetches it and writes the rows.
 */

/** One automatic rain gauge, as instance config. */
export interface RainGauge {
  /** Cemaden's station id (`idestacao` in the feed, `idpcd` in its charts). */
  id: number;
  /** Its name in Cemaden's network: "Mathias Velho". */
  name: string;
  /** Where it stands, as the Prefeitura's map describes it. */
  place: string;
  at: LngLat;
}

export interface RainSource {
  /** Who measures it, as cited under each reading. */
  agency: string;
  /** The live feed for the state, one entry per station. */
  feed: string;
  /** A station's own page, `{id}` replaced by its id: where a reading can be checked. */
  page: string;
  gauges: RainGauge[];
}

/** The windows Cemaden accumulates over, in hours. */
export const RAIN_WINDOWS = [1, 3, 6, 12, 24, 48, 72, 96] as const;
export type RainWindow = (typeof RAIN_WINDOWS)[number];

/** One gauge's state at one moment: the last 10-minute value and the accumulations up to it, in mm. */
export interface RainReading {
  gauge: number;
  /** When the gauge measured it (the feed's last value), not when it was fetched. */
  observedAt: Date;
  /** The last 10-minute value, mm. Null when the feed has none. */
  last: number | null;
  /** mm over the hours before `observedAt`. */
  acc: Record<RainWindow, number>;
}

/**
 * A number, or Cemaden's "-". The feed never writes a numeric 0 for an accumulation: a window with no
 * rain shows "-" (on 2026-10-26, 432 of 455 RS stations had "-" for the last hour, none had 0, and
 * their 10-minute values were 0). So "-" is read as 0 mm; a station that stops transmitting keeps its
 * last time, and the archive keeps one row per time, so a silent gauge adds no zeros.
 */
const mm = z.union([z.number().nonnegative(), z.literal("-")]).transform((v) => (v === "-" ? 0 : v));

const StationSchema = z.object({
  idestacao: z.number().int(),
  ultimovalor: z.number().nonnegative().nullable(),
  /** "26/10/26 18:10", in UTC. */
  datahoraUltimovalor: z.string(),
  acc1hr: mm,
  acc3hr: mm,
  acc6hr: mm,
  acc12hr: mm,
  acc24hr: mm,
  acc48hr: mm,
  acc72hr: mm,
  acc96hr: mm,
});

/** "26/10/26 18:10" (UTC, two-digit year) as an instant; null if it isn't one. */
export function parseCemadenTime(s: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(s.trim());
  const [d = 0, mo = 0, y = 0, h = 0, mi = 0] = m ? m.slice(1).map(Number) : [];
  if (!m) return null;
  const at = new Date(Date.UTC(2000 + y, mo - 1, d, h, mi));
  // Date.UTC rolls 31/02 over to March: only a date that reads back the same is one.
  return at.getUTCDate() === d && at.getUTCMonth() === mo - 1 && h < 24 && mi < 60 ? at : null;
}

/** mm to one decimal, as the gauges report them (0.2 mm tips): sums in floating point drift. */
const tenth = (v: number) => Math.round(v * 10) / 10;

/**
 * The readings of the given gauges in one copy of the feed. Stations not asked for, entries that don't
 * parse, and readings stamped more than `skewMinutes` after `fetchedAt` (a clock or format error) are
 * left out, and counted.
 */
export function readCemadenFeed(
  json: unknown,
  gauges: readonly number[],
  fetchedAt: Date,
  skewMinutes = 15,
): { readings: RainReading[]; skipped: number } {
  const wanted = new Set(gauges);
  const entries = Array.isArray(json) ? json : [];
  const readings: RainReading[] = [];
  let skipped = 0;
  for (const entry of entries) {
    const id = z.object({ idestacao: z.number() }).safeParse(entry);
    if (!id.success || !wanted.has(id.data.idestacao)) continue;
    const parsed = StationSchema.safeParse(entry);
    const observedAt = parsed.success ? parseCemadenTime(parsed.data.datahoraUltimovalor) : null;
    if (!parsed.success || !observedAt || observedAt.getTime() > fetchedAt.getTime() + skewMinutes * 60_000) {
      skipped++;
      continue;
    }
    const s = parsed.data;
    readings.push({
      gauge: s.idestacao,
      observedAt,
      last: s.ultimovalor === null ? null : tenth(s.ultimovalor),
      acc: {
        1: tenth(s.acc1hr),
        3: tenth(s.acc3hr),
        6: tenth(s.acc6hr),
        12: tenth(s.acc12hr),
        24: tenth(s.acc24hr),
        48: tenth(s.acc48hr),
        72: tenth(s.acc72hr),
        96: tenth(s.acc96hr),
      },
    });
  }
  return { readings, skipped };
}

/** A station's own page at the source, where anyone can check a reading. */
export const gaugePage = (source: RainSource, gauge: number) => source.page.replace("{id}", String(gauge));
