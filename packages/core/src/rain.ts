import { z } from "zod";
import { distance, localTime, zonedDate } from "./format";
import { haversine } from "./geo";
import { mmLabel } from "./rain-now";
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

/**
 * The day's rain beside a flooding record (BUILD 6.3): from the nearest gauge that measured anything
 * on the record's local day, the largest 24-hour accumulation it reported that day. Observed and
 * sourced (the gauge, its distance, the time of the reading), never a cause or a forecast.
 */
export const RainDaySchema = z.object({
  gauge: z.number().int(),
  /** The gauge's name in its network: "Mathias Velho". */
  name: z.string(),
  /** Who measures it: "Cemaden". */
  agency: z.string(),
  /** The station's own page, where the reading can be checked. */
  page: z.string(),
  /** From the record's point to the gauge. */
  meters: z.number().nonnegative(),
  /** mm over the 24 hours up to `until`. */
  mm: z.number().nonnegative(),
  /** When the gauge measured it (ISO). */
  until: z.string(),
});
export type RainDay = z.infer<typeof RainDaySchema>;

/** Gauges farther than this say nothing about a street. */
export const RAIN_MAX_METERS = 10_000;

export interface DayReading {
  gauge: number;
  observedAt: Date;
  acc24: number;
}

/** The day's rain for a point, from that day's readings (all gauges); null when none is near or none measured. */
export function dayRain(source: RainSource, at: LngLat, readings: readonly DayReading[]): RainDay | null {
  const gauges = source.gauges
    .map((g) => ({ g, meters: haversine(at, g.at) }))
    .filter((x) => x.meters <= RAIN_MAX_METERS)
    .toSorted((a, b) => a.meters - b.meters);
  for (const { g, meters } of gauges) {
    const own = readings.filter((r) => r.gauge === g.id);
    if (!own.length) continue;
    // The largest total; on a tie, the latest reading.
    const top = own.reduce((best, r) =>
      r.acc24 > best.acc24 || (r.acc24 === best.acc24 && r.observedAt > best.observedAt) ? r : best,
    );
    return {
      gauge: g.id,
      name: g.name,
      agency: source.agency,
      page: gaugePage(source, g.id),
      meters,
      mm: top.acc24,
      until: top.observedAt.toISOString(),
    };
  }
  return null;
}

/** The record's local day, as instants: readings in [from, to) belong to it. */
export function localDayBounds(at: Date, timezone: string): { from: Date; to: Date } {
  const t = localTime(at, timezone);
  const from = zonedDate({ year: t.year, month: t.month, day: t.day, hour: 0, minute: 0 }, timezone);
  const next = new Date(Date.UTC(t.year, t.month - 1, t.day + 1));
  const to = zonedDate(
    { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate(), hour: 0, minute: 0 },
    timezone,
  );
  return { from, to };
}

/**
 * "Nesse dia, 42,6 mm em 24 h no pluviômetro Mathias Velho, a 1,2 km." and its source line, as the
 * record and the resumo print them.
 */
export function rainLine(r: RainDay, timezone: string): { line: string; source: string } {
  const where = `no pluviômetro ${r.name}, a ${distance(r.meters)}`;
  const t = localTime(new Date(r.until), timezone);
  const hh = `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
  return {
    line: r.mm > 0 ? `Nesse dia, ${mmLabel(r.mm)} em 24 h ${where}.` : `Nesse dia, nenhuma chuva em 24 h ${where}.`,
    source: `${r.agency}, pluviômetro automático: o maior acumulado de 24 h medido nesse dia, às ${hh}.`,
  };
}
