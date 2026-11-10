import { haversine } from "./geo";
import type { RainSource } from "./rain";
import type { LngLat } from "./types";

/**
 * "Chuva agora" (DECISIONS round 23; BUILD 6.6): each gauge's last hour, its 24 hours, and its last 24
 * hours hour by hour, from the archive. Measured and sourced, shown with the time of the reading; a
 * gauge that hasn't reported for a while says so instead of showing a stale number as current.
 */

/** Older than this, a gauge's reading isn't "agora". */
export const RAIN_STALE_MINUTES = 180;

export interface NowReading {
  gauge: number;
  observedAt: Date;
  acc1: number;
  acc24: number;
}

/** One hour's bar: the mm in the hour up to `until`; null where the gauge sent nothing for it. */
export interface RainHour {
  until: string;
  mm: number | null;
}

export interface GaugeNow {
  id: number;
  name: string;
  place: string;
  at: LngLat;
  /** The latest reading (ISO), or null when the archive has none in the last 24 hours. */
  observedAt: string | null;
  /** mm in the hour up to `observedAt`. */
  lastHour: number | null;
  /** mm in the 24 hours up to `observedAt`. */
  day: number | null;
  /** The latest reading is older than RAIN_STALE_MINUTES. */
  stale: boolean;
  /** Oldest first, ending at `observedAt`. */
  hours: RainHour[];
}

/** Readings this close to an hour mark stand for it (the feed reports every 10 minutes at best). */
const MATCH_MS = 5 * 60_000;
const HOUR_MS = 3600_000;

/** A gauge's hours, back from its latest reading: each reading's 1-hour total, one per hour, never overlapping. */
export function hourlyBars(readings: readonly NowReading[], latest: Date, hours = 24): RainHour[] {
  const out: RainHour[] = [];
  for (let k = hours - 1; k >= 0; k--) {
    const target = latest.getTime() - k * HOUR_MS;
    const r = readings.find((x) => Math.abs(x.observedAt.getTime() - target) <= MATCH_MS);
    out.push({ until: new Date(target).toISOString(), mm: r ? r.acc1 : null });
  }
  return out;
}

export function gaugesNow(source: RainSource, readings: readonly NowReading[], now: Date): GaugeNow[] {
  return source.gauges.map((g) => {
    const own = readings.filter((r) => r.gauge === g.id);
    const latest = own.reduce<NowReading | null>((a, r) => (!a || r.observedAt > a.observedAt ? r : a), null);
    return {
      id: g.id,
      name: g.name,
      place: g.place,
      at: g.at,
      observedAt: latest ? latest.observedAt.toISOString() : null,
      lastHour: latest ? latest.acc1 : null,
      day: latest ? latest.acc24 : null,
      stale: !latest || now.getTime() - latest.observedAt.getTime() > RAIN_STALE_MINUTES * 60_000,
      hours: latest ? hourlyBars(own, latest.observedAt) : [],
    };
  });
}

/** Flooding records this close to a gauge are "under" its rain. */
export const DOWNPOUR_RADIUS_METERS = 2000;

export const rainingNow = (g: GaugeNow) => !g.stale && (g.lastHour ?? 0) > 0;

export const downpourNow = (g: GaugeNow, heavyMmPerHour: number) =>
  rainingNow(g) && (g.lastHour ?? 0) >= heavyMmPerHour;

/** The nearest gauge raining now within `radius` of a point, with its distance; null if none is. */
export function rainNear(
  at: LngLat,
  gauges: readonly GaugeNow[],
  { radius = DOWNPOUR_RADIUS_METERS, onlyHeavy }: { radius?: number; onlyHeavy?: number } = {},
): { gauge: GaugeNow; meters: number } | null {
  let best: { gauge: GaugeNow; meters: number } | null = null;
  for (const g of gauges) {
    if (onlyHeavy !== undefined ? !downpourNow(g, onlyHeavy) : !rainingNow(g)) continue;
    const meters = haversine(at, g.at);
    if (meters <= radius && (!best || meters < best.meters)) best = { gauge: g, meters };
  }
  return best;
}
