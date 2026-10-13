import { z } from "zod";
import type { NeighborhoodFeature } from "./types";

/**
 * A link's share card (DECISIONS rounds 11 and 15): what WhatsApp and the like show when someone
 * shares a pin or a bairro. The app reads the data and describes the card; the cards Worker only
 * draws it, so it needs no database and no secrets. Everything here is already public.
 */

/** A bairro's outline, projected to an SVG path in its own box. */
export const OutlineSchema = z.object({
  d: z.string().max(20_000),
  width: z.number().positive(),
  height: z.number().positive(),
  /** The pin, in the same box, when the card is for one. */
  pin: z.object({ x: z.number(), y: z.number() }).nullable(),
});
export type Outline = z.infer<typeof OutlineSchema>;

export const ItemCardSchema = z.object({
  kind: z.literal("item"),
  title: z.string().max(200),
  /** "Buraco na rua". */
  category: z.string().max(80),
  /** The bairro, or null for a city-wide item. */
  place: z.string().max(80).nullable(),
  /** The clock: days open, or how long it took to fix. */
  days: z.number().int().min(0),
  open: z.boolean(),
  /** Fictional demo data: the card says so (CLAUDE.md, data truth). */
  demo: z.boolean(),
  /** The first photo as a data URL (PNG or JPEG), or null. */
  photo: z.string().max(4_000_000).nullable(),
  /** Shown instead of a photo. */
  outline: OutlineSchema.nullable(),
  /** "falacanoas.com.br/o/7K3QF". */
  link: z.string().max(120),
});
export type ItemCard = z.infer<typeof ItemCardSchema>;

export const BairroCardSchema = z.object({
  kind: z.literal("bairro"),
  name: z.string().max(80),
  open: z.number().int().min(0),
  /** Open longer than the instance's deadline. */
  overdue: z.number().int().min(0),
  deadlineDays: z.number().int().positive(),
  demo: z.boolean(),
  outline: OutlineSchema.nullable(),
  link: z.string().max(120),
});
export type BairroCard = z.infer<typeof BairroCardSchema>;

export const ShareCardSchema = z.discriminatedUnion("kind", [ItemCardSchema, BairroCardSchema]);
export type ShareCard = z.infer<typeof ShareCardSchema>;

/** The size every network expects for a large preview. */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 };

/** "1 dia", "43 dias". */
export const daysLabel = (days: number) => (days === 1 ? "dia" : "dias");

/** The card's alt text and the preview's title line, in the same words. */
export function shareCardText(card: ShareCard): string {
  if (card.kind === "bairro") {
    const overdue = card.overdue ? `, ${card.overdue} há mais de ${card.deadlineDays} dias` : "";
    return `${card.name}: ${card.open} ${card.open === 1 ? "registro aberto" : "registros abertos"}${overdue}.`;
  }
  const clock = card.open
    ? `${card.days} ${daysLabel(card.days)} em aberto`
    : `resolvido em ${card.days} ${daysLabel(card.days)}`;
  return `${card.title}: ${clock}. ${card.category}${card.place ? `, ${card.place}` : ""}.`;
}

type Ring = number[][];
const polygonsOf = (f: NeighborhoodFeature): Ring[][] =>
  f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;

/**
 * A bairro's outline as an SVG path, `width` wide, in an equirectangular projection corrected for
 * latitude (a bairro is small enough). North up.
 */
export function outlineOf(
  feature: NeighborhoodFeature,
  width = 400,
  at: { lng: number; lat: number } | null = null,
): Outline {
  const points = polygonsOf(feature).flatMap((p) => p[0] ?? []);
  const xs = points.map((c) => c[0] ?? 0);
  const ys = points.map((c) => c[1] ?? 0);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  const height = Math.max(1, Math.round((width * (y1 - y0)) / ((x1 - x0) * k)));
  const x = (lng: number) => ((lng - x0) / (x1 - x0)) * width;
  const y = (lat: number) => ((y1 - lat) / (y1 - y0)) * height;
  const pt = (c: number[]) => `${x(c[0] ?? 0).toFixed(1)} ${y(c[1] ?? 0).toFixed(1)}`;
  const d = polygonsOf(feature)
    .map((p) => p.map((r) => `M${r.map(pt).join("L")}Z`).join(""))
    .join("");
  return { d, width, height, pin: at ? { x: x(at.lng), y: y(at.lat) } : null };
}
