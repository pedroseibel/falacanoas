/**
 * Fala Core: the domain shared by every municipal instance.
 *
 * Principles (see research/DECISIONS.md):
 * - The history belongs to the city, not to the author: events are append-only.
 * - Community and the public authority have separate voices: two status axes.
 * - "O Fala não decide quem está certo. Ele preserva o que aconteceu."
 *
 * Schemas are the single source of truth; types are inferred from them. External data
 * (JSON, fixtures, API rows) is parsed with these schemas, never cast.
 */
import { z } from "zod";
import { FloodNotesSchema } from "./flooding";
import { RainDaySchema, type RainSource } from "./rain";

export const LngLatSchema = z.tuple([z.number(), z.number()]);
export type LngLat = z.infer<typeof LngLatSchema>;

/** Where an item lives. Points first; the model leaves room for lines, areas and places. */
export const ScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("point"), lng: z.number(), lat: z.number() }),
  z.object({ type: z.literal("line"), coordinates: z.array(LngLatSchema) }),
  z.object({ type: z.literal("area"), coordinates: z.array(z.array(LngLatSchema)) }),
  z.object({
    type: z.literal("place"),
    placeId: z.string().optional(),
    label: z.string(),
    lng: z.number().optional(),
    lat: z.number().optional(),
  }),
  z.object({ type: z.literal("neighborhood"), neighborhood: z.string() }),
  z.object({ type: z.literal("municipality") }),
]);
export type Scope = z.infer<typeof ScopeSchema>;

export const ItemKindSchema = z.enum(["occurrence", "public_issue"]);
export type ItemKind = z.infer<typeof ItemKindSchema>;

/** What residents say. Derived from confirmations and updates. */
export const CommunityStatusSchema = z.enum(["reported", "confirmed", "ongoing", "apparently_resolved", "resolved"]);
export type CommunityStatus = z.infer<typeof CommunityStatusSchema>;

/** What a verified public body says. Never overwrites the community status. */
export const OfficialStatusSchema = z.enum(["acknowledged", "under_review", "scheduled", "in_progress", "resolved"]);
export type OfficialStatus = z.infer<typeof OfficialStatusSchema>;

export const VisibilitySchema = z.enum(["pseudonymous", "anonymous"]);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const PhotoSchema = z.object({
  /** The stored photo's id, so it can be reported or reviewed; absent on fixtures. */
  id: z.string().optional(),
  src: z.string(),
  takenAt: z.string(),
  by: z.string(),
  credit: z.string().optional(),
});
export type Photo = z.infer<typeof PhotoSchema>;

export const OfficialStateSchema = z.object({
  status: OfficialStatusSchema,
  agency: z.string(),
  daysAgo: z.number().int().nonnegative(),
});
export type OfficialState = z.infer<typeof OfficialStateSchema>;

/** Append-only events. The visible state of an item is derived from these. */
export const ItemEventKindSchema = z.enum([
  "created",
  "sent_to_authority",
  "confirmed",
  "update_added",
  "photo_added",
  "official_response",
  "official_status_changed",
  "community_resolved",
  "reopened",
  "merged",
  "moderation",
]);
export type ItemEventKind = z.infer<typeof ItemEventKindSchema>;

export const ItemEventSchema = z.object({
  /** The stored event's id, so an update can be reported; absent on fixtures. */
  id: z.string().optional(),
  at: z.string(),
  actor: z.string(),
  kind: ItemEventKindSchema,
  text: z.string(),
  /** An update moderation took down: its words are gone from the page, the fact that it existed is not. */
  removed: z.boolean().optional(),
});
export type ItemEvent = z.infer<typeof ItemEventSchema>;

export const ItemSchema = z.object({
  id: z.string().min(4).max(12),
  kind: ItemKindSchema,
  category: z.string(),
  title: z.string(),
  text: z.string(),
  neighborhood: z.string().nullable(),
  scope: ScopeSchema,
  /** The resident's ponto de referência ("em frente à escola"), when they gave one. */
  reference: z.string().optional(),
  /** What the reporter saw, on a type that asks it (core flooding.ts): cause, rain, how long. */
  flooding: FloodNotesSchema.optional(),
  /** On a flooding record, the day's rain at the nearest gauge (core rain.ts), read with the record. */
  rain: RainDaySchema.nullable().optional(),
  /**
   * Street and number near the point, looked up once when it was registered (OpenStreetMap's
   * Nominatim). Approximate: the point on the map is the truth.
   */
  address: z.string().nullable().optional(),
  /** Days open (or days until fixed, when resolved). */
  days: z.number().int().nonnegative(),
  updatedMinutesAgo: z.number().int().nonnegative(),
  confirmations: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative(),
  updates: z.number().int().nonnegative(),
  /** Published photos only: a photo shows once moderation has looked at it. */
  photos: z.array(PhotoSchema),
  /** Photos sent but still waiting for moderation: shown as "em análise", never as an image. */
  pendingPhotos: z.number().int().positive().optional(),
  visibility: VisibilitySchema,
  author: z.string().nullable(),
  community: CommunityStatusSchema,
  official: OfficialStateSchema.nullable(),
  /** Residents contradicting an official "resolved". */
  disagreeing: z.number().int().nonnegative().optional(),
  /**
   * When the daily digest carried this item to the Prefeitura (enviadoEm, ISO). Null while it waits
   * for the next digest; absent on fixtures, whose dates are derived from `days`.
   */
  sentAt: z.string().nullable().optional(),
  /**
   * The Prefeitura's protocol (protocoladoEm), when one came back: evidence of receipt and the
   * reference for the legal deadline. It never restarts the public clock (DECISIONS, rounds 5 and 18).
   */
  protocol: z.object({ number: z.string(), at: z.string() }).nullable().optional(),
  /** Neighbours who said it was fixed in the current round (resets when it reopens). */
  resolvedVotes: z.number().int().nonnegative().optional(),
  /** When someone first said it was fixed in this round (ISO): 15 days later it closes, if undisputed. */
  resolvingSince: z.string().nullable().optional(),
  /** When it was registered (ISO); absent on fixtures. */
  createdAt: z.string().optional(),
  /** When the community closed it (ISO); absent on fixtures. */
  closedAt: z.string().nullable().optional(),
  /** Dropped by a guest (no account): held for moderation and needs two independent confirmations to count. */
  guest: z.boolean().optional(),
  /** Absent once published. A guest pin waits for moderation before it shows on the map (round 2). */
  moderation: z.enum(["pending", "rejected"]).optional(),
  /** Fictional demonstration data: always labelled "exemplo" wherever it shows. */
  demo: z.boolean().optional(),
  events: z.array(ItemEventSchema).optional(),
});
export type Item = z.infer<typeof ItemSchema>;

export const ThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  by: z.string(),
  ago: z.string(),
  pin: z.string().optional(),
  /** Fictional demo data, labelled "exemplo". */
  demo: z.boolean().optional(),
  replies: z.array(z.object({ id: z.string().optional(), by: z.string(), ago: z.string(), text: z.string() })),
});
export type Thread = z.infer<typeof ThreadSchema>;

export const ViewerSchema = z.object({
  nick: z.string(),
  neighborhood: z.string(),
  phoneVerified: z.boolean(),
  identityVerified: z.boolean(),
  location: LngLatSchema,
  following: z.array(
    z.object({ type: z.enum(["home", "route", "neighborhood", "item"]), label: z.string(), detail: z.string() }),
  ),
});
export type Viewer = z.infer<typeof ViewerSchema>;

/* ---------- Geography ---------- */

const Ring = z.array(z.array(z.number()).min(2));
export const PolygonSchema = z.object({ type: z.literal("Polygon"), coordinates: z.array(Ring) });
export const MultiPolygonSchema = z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(Ring)) });
export const AreaGeometrySchema = z.discriminatedUnion("type", [PolygonSchema, MultiPolygonSchema]);
export type AreaGeometry = z.infer<typeof AreaGeometrySchema>;

export const NeighborhoodFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.object({ slug: z.string(), name: z.string() }),
  geometry: AreaGeometrySchema,
});
export type NeighborhoodFeature = z.infer<typeof NeighborhoodFeatureSchema>;

export const NeighborhoodCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(NeighborhoodFeatureSchema),
});
export type NeighborhoodCollection = z.infer<typeof NeighborhoodCollectionSchema>;

export const BoundaryCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(
    z.object({
      type: z.literal("Feature"),
      properties: z.record(z.string(), z.unknown()),
      geometry: AreaGeometrySchema,
    }),
  ),
});
export type BoundaryCollection = z.infer<typeof BoundaryCollectionSchema>;

export const NeighborhoodSchema = z.object({
  slug: z.string(),
  name: z.string(),
  /** Confirmed sign-ups needed to open this bairro; null opens with the first bairro. */
  threshold: z.number().int().positive().nullable(),
  center: LngLatSchema,
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});
export type Neighborhood = z.infer<typeof NeighborhoodSchema>;

/* ---------- Instance configuration (authored in TypeScript, checked at compile time) ---------- */

export interface Category {
  key: string;
  label: string;
  /** Group used by the filter chips. */
  group: string;
  /** Public body responsible, as far as the instance knows. */
  agency: string | null;
  kind: ItemKind;
  /** Extra questions this type asks (core flooding.ts for "flooding"). */
  asks?: "flooding";
}

export interface FilterGroup {
  key: string;
  label: string;
  icon?: string;
}

export interface Municipality {
  slug: string;
  name: string;
  state: string;
  country: string;
  locale: string;
  timezone: string;
  center: LngLat;
  bounds: [LngLat, LngLat];
  /** Reference deadline shown on rulers (Lei 13.460/2017, art. 16). */
  deadlineDays: number;
  /** Hour of the daily digest sent to the public authority. */
  digestHour: number;
  categories: Category[];
  filterGroups: FilterGroup[];
  neighborhoods: Neighborhood[];
  geo: { neighborhoods: NeighborhoodCollection; boundary: BoundaryCollection };
  branding: {
    name: string;
    domain: string;
    /**
     * The project's WhatsApp number (digits, with the country code), where people confirm their place
     * in a bairro's queue. Absent until the instance has one.
     */
    whatsapp?: string;
  };
  /**
   * The open data's licence (DECISIONS round 10): CC BY 4.0 or ODbL. Absent until the instance picks
   * one, and the open-data API won't run in production without it.
   */
  openDataLicence?: "CC-BY-4.0" | "ODbL-1.0";
  /**
   * Campaign periods (inclusive dates, local), when anonymous electoral propaganda is held for
   * moderation (round 18, Q31).
   */
  electionPeriods?: { from: string; to: string }[];
  /**
   * Where to turn in an emergency, as the municipality publishes it (the Fala is never an emergency
   * channel, round 11). Shown in the report form, the FAQ and the landing's footer.
   */
  emergency: {
    /** The civil defence's lines, the short number first ("199", then its 24-hour line). */
    civilDefense: EmergencyLine[];
    /** The fire brigade. */
    fire: EmergencyLine;
    /** Official alerts by SMS (the national 40199 service: send the CEP). */
    alertsSms?: { number: string; how: string };
  };
  /**
   * The automatic rain gauges in the municipality and where their live feed is (research/alagamentos).
   * The digest service archives it every 10 minutes; flooding records cite the nearest gauge.
   */
  rain?: RainSource;
}

export interface EmergencyLine {
  /** As printed: "(51) 98255-0805". */
  display: string;
  /** For tel: and wa.me links, digits only (with the area code). */
  tel: string;
  /** The same number also answers on WhatsApp. */
  whatsapp?: boolean;
}
