import { FLOOD_NEARBY_METERS, floodHistory, type FloodHistory, type Item } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { and, between, eq, inArray } from "drizzle-orm";
import type { Db } from "./db/client";
import { itemPhotos, items } from "./db/schema";

/** The types that ask the flooding questions are the ones whose history this counts. */
const FLOOD_TYPES = canoas.categories.filter((c) => c.asks === "flooding").map((c) => c.key);
/** A box a little wider than the stretch, in degrees (about 220 m at Canoas's latitude); haversine decides. */
const BOX = 0.002;

/**
 * The days flooding was registered near a flooding record (BUILD 6.5; core flood-history.ts): its
 * stretch's published flooding records and their approved photos, real with real and examples with
 * examples. Null when the type isn't one, the record has no point, or there's only one day.
 */
export async function floodHistoryForItem(q: Pick<Db, "select">, item: Item): Promise<FloodHistory | null> {
  const s = item.scope;
  if (!FLOOD_TYPES.includes(item.category)) return null;
  if ((s.type !== "point" && s.type !== "place") || s.lng === undefined || s.lat === undefined) return null;
  const nearby = and(
    inArray(items.category, FLOOD_TYPES),
    eq(items.moderation, "published"),
    eq(items.demo, item.demo ?? false),
    between(items.lng, s.lng - BOX, s.lng + BOX),
    between(items.lat, s.lat - BOX, s.lat + BOX),
  );
  const [records, photos] = await Promise.all([
    q.select({ lng: items.lng, lat: items.lat, when: items.createdAt }).from(items).where(nearby),
    q
      .select({ lng: items.lng, lat: items.lat, when: itemPhotos.takenAt })
      .from(itemPhotos)
      .innerJoin(items, eq(items.id, itemPhotos.itemId))
      .where(and(nearby, eq(itemPhotos.review, "approved"))),
  ]);
  const sightings = [...records, ...photos].flatMap((r) =>
    r.lng === null || r.lat === null ? [] : [{ at: [r.lng, r.lat] satisfies [number, number], when: r.when }],
  );
  return floodHistory([s.lng, s.lat], sightings, canoas.timezone, FLOOD_NEARBY_METERS);
}
