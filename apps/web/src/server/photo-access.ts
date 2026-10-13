import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "./db/client";
import { escalations, itemPhotos, items } from "./db/schema";

/**
 * Who may see a stored photo (the abuse review of 2026-10-13): everyone, once moderation approved it
 * on a published item; only moderators while it waits, or after it was removed or its item came off
 * the map. Nobody, ever, once it was escalated as child abuse (round 20): it is kept only for the
 * authorities. A photo that belongs to no item (an upload whose report failed) is nobody's.
 */
export async function photoAudience(key: string): Promise<"public" | "moderators" | null> {
  const [row] = await db
    .select({ review: itemPhotos.review, moderation: items.moderation, escalated: escalations.id })
    .from(itemPhotos)
    .innerJoin(items, eq(items.id, itemPhotos.itemId))
    .leftJoin(
      escalations,
      and(
        eq(escalations.itemId, itemPhotos.itemId),
        or(eq(escalations.photoId, itemPhotos.id), isNull(escalations.photoId)),
      ),
    )
    .where(eq(itemPhotos.storageKey, key))
    .limit(1);
  if (!row || row.escalated) return null;
  return row.review === "approved" && row.moderation === "published" ? "public" : "moderators";
}
