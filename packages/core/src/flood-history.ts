import { z } from "zod";
import { localTime, MONTHS_PT } from "./format";
import { haversine } from "./geo";
import type { LngLat } from "./types";

/**
 * A flooding record's place over time (research/alagamentos, method 1; BUILD 6.5): on how many
 * different days flooding was registered within a short stretch of it, and from when to when. Only
 * what was published: a flooding record, or a photo added to one, marks its local day. A confirmation
 * without a photo doesn't (someone can say a street floods on a dry day). Observed, never a risk:
 * "sem relatos não é sem alagamento".
 */

/** A stretch of street, not a lot: wide enough for one corner, narrow enough not to name a block. */
export const FLOOD_NEARBY_METERS = 150;

export const FloodHistorySchema = z.object({
  /** Different local days with a record or a photo of flooding. */
  days: z.number().int().positive(),
  /** The first and last of them (ISO). */
  first: z.string(),
  last: z.string(),
  meters: z.number().int().positive(),
});
export type FloodHistory = z.infer<typeof FloodHistorySchema>;

/** One sign of flooding on one day: a record's registration, or a photo added to it. */
export interface FloodSighting {
  at: LngLat;
  when: Date;
}

/** The stretch's days; null below two, when the record itself is all there is. */
export function floodHistory(
  at: LngLat,
  sightings: readonly FloodSighting[],
  timezone: string,
  meters = FLOOD_NEARBY_METERS,
): FloodHistory | null {
  const days = new Map<string, Date>();
  for (const s of sightings) {
    if (haversine(at, s.at) > meters) continue;
    const t = localTime(s.when, timezone);
    const key = `${t.year}-${t.month}-${t.day}`;
    const seen = days.get(key);
    if (!seen || s.when < seen) days.set(key, s.when);
  }
  if (days.size < 2) return null;
  const sorted = [...days.values()].toSorted((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!first || !last) return null;
  return { days: days.size, first: first.toISOString(), last: last.toISOString(), meters };
}

const day = (iso: string, timezone: string) => {
  const t = localTime(new Date(iso), timezone);
  return `${t.day} ${MONTHS_PT[t.month - 1] ?? ""} ${t.year}`;
};

/** "Neste trecho, até 150 m: alagamento registrado em 4 dias diferentes, de 12 jun 2026 a 26 out 2026." */
export function floodHistoryLine(h: FloodHistory, timezone: string): { line: string; note: string } {
  return {
    line: `Neste trecho, até ${h.meters} m: alagamento registrado em ${h.days} dias diferentes, de ${day(h.first, timezone)} a ${day(h.last, timezone)}.`,
    note: "Contam os registros e as fotos de alagamento publicados no Fala. Sem relatos não é sem alagamento.",
  };
}
