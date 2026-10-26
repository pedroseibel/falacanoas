import { z } from "zod";
import { FloodNotesSchema, floodNotesFor } from "./flooding";
import { localHour, localStamp } from "./format";
import { haversine, neighborhoodAt } from "./geo";
import { categoryOf, deriveEvents, isOpen, itemLngLat } from "./logic";
import { readableCode } from "./signup";
import {
  ItemKindSchema,
  LngLatSchema,
  VisibilitySchema,
  type CommunityStatus,
  type Item,
  type LngLat,
  type Municipality,
  type Scope,
} from "./types";

/**
 * The report flow ("Registrar"): what a resident sends and how it becomes an item.
 * See research/DECISIONS.md, rounds 3, 4, 6 and 15.
 */
export const REPORT = {
  maxPhotos: 4,
  maxText: 280,
  minTitle: 8,
  maxTitle: 90,
  maxPlace: 60,
  /** A problem's ponto de referência ("em frente à escola"): what crews ask for (research/digest-pdf). */
  maxReference: 80,
  /** Open items of the same type closer than this are offered as the same problem. */
  duplicateMeters: 50,
  /** Photos are re-encoded on the device to this longest edge, which also drops EXIF and GPS. */
  photoEdge: 1600,
  photoBytes: 3 * 1024 * 1024,
};

/** What a questão pública is about: one place, a whole bairro, or the city. */
export const ReachSchema = z.enum(["place", "neighborhood", "municipality"]);
export type Reach = z.infer<typeof ReachSchema>;

export const PhotoFileSchema = z
  .file()
  .mime(["image/webp", "image/jpeg"], "Envie a foto em WebP ou JPEG.")
  .max(REPORT.photoBytes, "Essa foto ficou grande demais. Tente outra.");

/**
 * Everything the form holds. One flat shape for both kinds, so switching between a problem and a
 * questão pública keeps what was typed; the rules for each kind live in reportSchema.
 */
export const ReportFieldsSchema = z.object({
  kind: ItemKindSchema,
  photos: z.array(PhotoFileSchema).max(REPORT.maxPhotos, `Até ${REPORT.maxPhotos} fotos por registro.`),
  /** Category key; ignored for a questão pública. */
  category: z.string(),
  /** A questão pública's one-line title; a problem's title comes from its text. */
  title: z.string(),
  reach: ReachSchema,
  /** Optional name of the place a questão is about ("UBS Niterói"). */
  place: z.string().max(REPORT.maxPlace, `Use no máximo ${REPORT.maxPlace} caracteres.`),
  /** Bairro slug when the questão covers a whole bairro. */
  neighborhood: z.string(),
  /** A problem's ponto de referência, to find the spot; optional. Ignored for a questão pública. */
  reference: z.string().max(REPORT.maxReference, `Use no máximo ${REPORT.maxReference} caracteres.`),
  /** On a type that asks them (a street that floods), what the person saw; all optional. */
  flooding: FloodNotesSchema,
  /** The map crosshair. Null until the person places it. */
  location: LngLatSchema.nullable(),
  text: z.string().max(REPORT.maxText, `Use no máximo ${REPORT.maxText} caracteres.`),
  visibility: VisibilitySchema,
});
export type ReportFields = z.infer<typeof ReportFieldsSchema>;

/** Does this report need a point on the map? Problems always; a questão only when it is about one place. */
export const needsLocation = (v: Pick<ReportFields, "kind" | "reach">) =>
  v.kind === "occurrence" || v.reach === "place";

/** The report rules for one municipality: its categories and its map. Shared by the form and the server. */
export function reportSchema(muni: Municipality) {
  return ReportFieldsSchema.superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (v.kind === "occurrence") {
      if (v.photos.length === 0) issue("photos", "Mande pelo menos uma foto do problema.");
      const category = muni.categories.find((c) => c.key === v.category);
      if (!category || category.kind !== "occurrence") issue("category", "Escolha o tipo de problema.");
    } else {
      const title = v.title.trim();
      if (title.length < REPORT.minTitle) issue("title", "Escreva a questão em uma frase.");
      else if (title.length > REPORT.maxTitle) issue("title", `Use no máximo ${REPORT.maxTitle} caracteres.`);
      if (v.reach === "neighborhood" && !muni.neighborhoods.some((n) => n.slug === v.neighborhood))
        issue("neighborhood", "Escolha o bairro.");
    }
    if (needsLocation(v)) {
      if (!v.location) issue("location", "Marque o lugar: arraste o mapa ou use a sua localização.");
      else if (!neighborhoodAt(v.location, muni.geo.neighborhoods))
        issue("location", `Esse ponto fica fora de ${muni.name}. Arraste o mapa até o lugar.`);
    }
  });
}

export interface Duplicate {
  item: Item;
  meters: number;
}

/** The nearest open problem of the same type within the radius, so a neighbour can add to it instead. */
export function findDuplicate(
  items: Item[],
  category: string,
  at: LngLat,
  { radius = REPORT.duplicateMeters, ignore = [] }: { radius?: number; ignore?: string[] } = {},
): Duplicate | null {
  let best: Duplicate | null = null;
  for (const item of items) {
    if (item.kind !== "occurrence" || item.category !== category || !isOpen(item) || ignore.includes(item.id)) continue;
    const p = itemLngLat(item);
    if (!p) continue;
    const meters = haversine(at, p);
    if (meters <= radius && (!best || meters < best.meters)) best = { item, meters };
  }
  return best;
}

/** Five readable characters, like the fixtures' "7K3QF": short enough to say on the phone. */
export const newItemId = (random: ArrayLike<number>) => readableCode(random, 5);

/** A problem's title: the first sentence of what the person wrote, or the category's name. */
export function reportTitle(text: string, fallback: string, max = 80): string {
  const first =
    text
      .trim()
      .split(/[.!?\n]/)[0]
      ?.trim() ?? "";
  if (!first) return fallback;
  const space = first.lastIndexOf(" ", max - 1);
  const cut = first.length > max ? `${first.slice(0, space > 0 ? space : max - 1)}…` : first;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

/** Today's digest or tomorrow's: what goes in after the digest hour waits for the next one. */
export const digestDay = (now: Date, muni: Pick<Municipality, "timezone" | "digestHour">): "hoje" | "amanhã" =>
  localHour(now, muni.timezone) < muni.digestHour ? "hoje" : "amanhã";

/** Posted but not yet sent in a digest: the public clock hasn't started. */
export const awaitingDigest = (it: Item) =>
  it.sentAt === null || (Boolean(it.events?.length) && !it.events?.some((e) => e.kind === "sent_to_authority"));

const DAY_MS = 864e5;

/**
 * The Ouvidoria's legal deadline (Lei 13.460, art. 16): 30 days from receipt, extendable once by
 * another 30 with justification. Counted from the protocol, separately from the public clock.
 */
export function legalDeadline(protocolAt: Date, now: Date, days = 30) {
  const due = new Date(protocolAt.getTime() + days * DAY_MS);
  const extendedDue = new Date(protocolAt.getTime() + 2 * days * DAY_MS);
  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / DAY_MS);
  return { due, extendedDue, daysLeft, overdue: daysLeft < 0 };
}

/** A confirmation must come from a phone verified at least this long ago (DECISIONS round 18, Q17). */
export const CONFIRMATION_MIN_HOURS = 72;

export type ConfirmationStatus = "counts" | "already" | "too-new";

/**
 * Whether a neighbour's confirmation counts as independent: a different account (the author is
 * recorded as having confirmed already), one per account, and a phone verified ≥72 h ago, counted
 * from the verification, not from when the account or session was created.
 */
export function confirmationStatus({
  alreadyConfirmed,
  phoneVerifiedAt,
  now,
}: {
  alreadyConfirmed: boolean;
  phoneVerifiedAt: Date | null;
  now: Date;
}): ConfirmationStatus {
  if (alreadyConfirmed) return "already";
  if (!phoneVerifiedAt || now.getTime() - phoneVerifiedAt.getTime() < CONFIRMATION_MIN_HOURS * 36e5) return "too-new";
  return "counts";
}

function scopeOf(v: ReportFields, at: LngLat | null): Scope {
  if (v.kind === "public_issue" && v.reach === "municipality") return { type: "municipality" };
  if (v.kind === "public_issue" && v.reach === "neighborhood")
    return { type: "neighborhood", neighborhood: v.neighborhood };
  if (!at) throw new Error("Registro sem lugar no mapa.");
  const [lng, lat] = at;
  const place = v.kind === "public_issue" ? v.place.trim() : "";
  return place ? { type: "place", label: place, lng, lat } : { type: "point", lng, lat };
}

export interface ReportContext {
  id: string;
  /** The author's apelido; kept off the item when they post as Anônimo. */
  nick: string;
  /** Public URLs of the stored photos, in order. */
  photos: string[];
  now: Date;
}

/** A validated report becomes an item with one event: "created". Nothing else is known yet. */
export function itemFromReport(v: ReportFields, muni: Municipality, ctx: ReportContext): Item {
  const issue = v.kind === "public_issue";
  const anonymous = v.visibility === "anonymous";
  const by = anonymous ? "Anônimo" : ctx.nick;
  const stamp = localStamp(ctx.now, muni.timezone);
  const at = needsLocation(v) ? v.location : null;
  const scope = scopeOf(v, at);
  const category = issue ? (muni.categories.find((c) => c.kind === "public_issue")?.key ?? "questao") : v.category;
  const text = v.text.trim();
  const reference = issue ? "" : v.reference.trim();
  const flooding = issue ? undefined : floodNotesFor(muni, category, v.flooding);
  const n = ctx.photos.length;
  return {
    id: ctx.id,
    kind: v.kind,
    category,
    title: issue ? v.title.trim() : reportTitle(text, categoryOf(muni, category).label),
    text,
    ...(reference ? { reference } : {}),
    ...(flooding ? { flooding } : {}),
    neighborhood:
      scope.type === "neighborhood" ? scope.neighborhood : at ? neighborhoodAt(at, muni.geo.neighborhoods) : null,
    scope,
    days: 0,
    updatedMinutesAgo: 0,
    confirmations: 0,
    followers: 1,
    updates: 0,
    photos: ctx.photos.map((src) => ({ src, takenAt: stamp, by })),
    visibility: v.visibility,
    author: anonymous ? null : ctx.nick,
    community: "reported",
    official: null,
    sentAt: null,
    protocol: null,
    events: [
      {
        at: stamp,
        actor: by,
        kind: "created",
        text: n ? `Registrou com ${n === 1 ? "foto" : `${n} fotos`}.` : "Registrou.",
      },
    ],
  };
}

const AFTER_CONFIRMATION: Record<CommunityStatus, CommunityStatus> = {
  reported: "confirmed",
  confirmed: "confirmed",
  ongoing: "ongoing",
  apparently_resolved: "ongoing",
  resolved: "resolved",
};

export interface ConfirmationContext {
  /** Apelido, or "Anônimo". */
  by: string;
  photos: string[];
  now: Date;
  /** False when this person had already confirmed: their photos still join the timeline. */
  counts: boolean;
  /** Formats "N days ago" for items whose history is still derived (fixtures). */
  dateAgo: (days: number) => string;
}

/** "Eu também": a neighbour confirms an existing problem, optionally with a current photo. Append-only. */
export function confirmItem(it: Item, muni: Municipality, ctx: ConfirmationContext): Item {
  const withPhoto = ctx.photos.length > 0;
  if (!ctx.counts && !withPhoto) return it;
  const stamp = localStamp(ctx.now, muni.timezone);
  return {
    ...it,
    confirmations: it.confirmations + (ctx.counts ? 1 : 0),
    community: ctx.counts ? AFTER_CONFIRMATION[it.community] : it.community,
    updatedMinutesAgo: 0,
    updates: it.updates + 1,
    photos: [...it.photos, ...ctx.photos.map((src) => ({ src, takenAt: stamp, by: ctx.by }))],
    events: [
      ...deriveEvents(it, ctx.dateAgo),
      {
        at: stamp,
        actor: ctx.by,
        kind: withPhoto ? "photo_added" : "confirmed",
        text: withPhoto ? "Confirmou e adicionou uma foto atual." : "Confirmou que está acontecendo.",
      },
    ],
  };
}
