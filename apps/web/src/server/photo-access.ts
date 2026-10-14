import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "./db/client";
import { escalations, itemPhotos, items, photoScreens } from "./db/schema";
import { hashMatchingRequired, visibleToModerators } from "./known-material";

/**
 * Who may see a stored photo (the abuse review of 2026-10-13): everyone, once moderation approved it
 * on a published item; only moderators while it waits, or after it was removed or its item came off
 * the map. Nobody, ever, once it was escalated as child abuse (round 20): it is kept only for the
 * authorities. A photo that belongs to no item (an upload whose report failed) is nobody's.
 */
export async function photoAudience(key: string): Promise<"public" | "moderators" | null> {
  const [row] = await db
    .select({
      review: itemPhotos.review,
      moderation: items.moderation,
      escalated: escalations.id,
      known: photoScreens.known,
      knownReview: photoScreens.knownReview,
    })
    .from(itemPhotos)
    .innerJoin(items, eq(items.id, itemPhotos.itemId))
    .leftJoin(photoScreens, eq(photoScreens.storageKey, itemPhotos.storageKey))
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
  if (row.review === "approved" && row.moderation === "published") return "public";
  // Known abuse material (BUILD 5.8): until the check is in, not even moderators get the bytes.
  return visibleToModerators(row.review, row, hashMatchingRequired()) ? "moderators" : null;
}
