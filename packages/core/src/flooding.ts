import { z } from "zod";
import { relativeTime } from "./format";
import type { Municipality } from "./types";

/**
 * What a resident saw when a street flooded (research/alagamentos): three optional questions on the
 * types the instance marks `asks: "flooding"`. In Canoas one symptom has many causes (a blocked
 * drain, a full vala, a stopped pump station, a high river), and these tell them apart over time.
 * Each is what one person saw, said as theirs: never a diagnosis.
 */

export const FloodCauseSchema = z.enum(["bueiro", "valeta", "bombas", "rio", "nao_sei"]);
export type FloodCause = z.infer<typeof FloodCauseSchema>;

export const FloodDurationSchema = z.enum(["menos_1h", "1_3h", "mais_3h", "ainda"]);
export type FloodDuration = z.infer<typeof FloodDurationSchema>;

export const FloodNotesSchema = z.object({
  /** The cause seen. */
  cause: FloodCauseSchema.optional(),
  /** Whether it was raining when they registered. */
  raining: z.boolean().optional(),
  /** How long the water stayed. */
  duration: FloodDurationSchema.optional(),
});
export type FloodNotes = z.infer<typeof FloodNotesSchema>;

/** The options as the form and WhatsApp offer them, in this order. */
export const FLOOD_CAUSES: { key: FloodCause; label: string }[] = [
  { key: "bueiro", label: "Bueiro entupido" },
  { key: "valeta", label: "Valeta cheia" },
  { key: "bombas", label: "Casa de bombas parada" },
  { key: "rio", label: "Rio alto" },
  { key: "nao_sei", label: "Não sei" },
];

export const FLOOD_DURATIONS: { key: FloodDuration; label: string }[] = [
  { key: "menos_1h", label: "Menos de 1 hora" },
  { key: "1_3h", label: "De 1 a 3 horas" },
  { key: "mais_3h", label: "Mais de 3 horas" },
  { key: "ainda", label: "Ainda não baixou" },
];

/** Does this type ask the flooding questions? */
export const asksFlooding = (muni: Pick<Municipality, "categories">, category: string) =>
  muni.categories.some((c) => c.key === category && c.asks === "flooding");

/** The answers worth keeping: none for other types, and nothing when none was given. */
export function floodNotesFor(
  muni: Pick<Municipality, "categories">,
  category: string,
  notes: FloodNotes,
): FloodNotes | undefined {
  if (!asksFlooding(muni, category)) return undefined;
  const kept: FloodNotes = {
    ...(notes.cause ? { cause: notes.cause } : {}),
    ...(notes.raining !== undefined ? { raining: notes.raining } : {}),
    ...(notes.duration ? { duration: notes.duration } : {}),
  };
  return Object.keys(kept).length ? kept : undefined;
}

const label = <K extends string>(list: { key: K; label: string }[], key: K) =>
  list.find((o) => o.key === key)?.label ?? key;

/**
 * The answers as the record shows them, one line each, in the reporter's voice ("segundo quem
 * registrou" is said once, by whoever shows them).
 */
export function floodLines(notes: FloodNotes): { term: string; value: string }[] {
  const lines: { term: string; value: string }[] = [];
  if (notes.cause)
    lines.push({
      term: "O que viu",
      value: notes.cause === "nao_sei" ? "não soube dizer a causa" : label(FLOOD_CAUSES, notes.cause).toLowerCase(),
    });
  if (notes.raining !== undefined)
    lines.push({ term: "Na hora", value: notes.raining ? "estava chovendo" : "não estava chovendo" });
  if (notes.duration)
    lines.push({
      term: "A água",
      value:
        notes.duration === "ainda"
          ? "ainda não tinha baixado"
          : `ficou ${label(FLOOD_DURATIONS, notes.duration).toLowerCase()}`,
    });
  return lines;
}

/** How long a flooding record or a new photo on one counts as fresh on the map ("Chuva agora", round 23). */
export const FRESH_FLOOD_MINUTES = 180;

export interface FreshFlood {
  minutes: number;
  /** The latest sign is a photo added after the record, not the record itself. */
  photo: boolean;
  /** The resident said, when registering, that the water hadn't gone down. */
  stillThere: boolean;
}

/**
 * A flooding record registered, or given a photo, in the last three hours; null otherwise. It says when
 * people last saw it, never that it is flooded now, and it expires on its own.
 */
export function freshFlood(
  muni: Pick<Municipality, "categories">,
  item: { category: string; createdAt?: string; lastSeenAt?: string; flooding?: FloodNotes },
  now: Date,
): FreshFlood | null {
  if (!asksFlooding(muni, item.category)) return null;
  const seen = item.lastSeenAt ?? item.createdAt;
  if (!seen) return null;
  const minutes = Math.floor((now.getTime() - new Date(seen).getTime()) / 60_000);
  if (minutes < 0 || minutes > FRESH_FLOOD_MINUTES) return null;
  const photo = Boolean(item.createdAt && item.lastSeenAt && item.lastSeenAt > item.createdAt);
  return { minutes, photo, stillThere: !photo && item.flooding?.duration === "ainda" };
}

/** The map's tag: "há 40 min", "há 2 h · não baixou". */
export const freshTag = (f: FreshFlood) => `${relativeTime(f.minutes)}${f.stillThere ? " · não baixou" : ""}`;

/** The record's line: "Registrado há 40 min; a água ainda não tinha baixado." */
export const freshLine = (f: FreshFlood) =>
  f.photo
    ? `Foto nova ${relativeTime(f.minutes)}.`
    : `Registrado ${relativeTime(f.minutes)}${f.stillThere ? "; a água ainda não tinha baixado" : ""}.`;
