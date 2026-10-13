import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { itemPhotos, items } from "./db/schema";

/**
 * Who may see a stored photo (the abuse review of 2026-10-13): everyone, once moderation approved it
 * on a published item; only moderators while it waits, or after it was removed or its item came off
 * the map. A photo that belongs to no item (an upload whose report failed) is nobody's.
 */
export async function photoAudience(key: string): Promise<"public" | "moderators" | null> {
  const [row] = await db
    .select({ review: itemPhotos.review, moderation: items.moderation })
    .from(itemPhotos)
    .innerJoin(items, eq(items.id, itemPhotos.itemId))
    .where(eq(itemPhotos.storageKey, key));
  if (!row) return null;
  return row.review === "approved" && row.moderation === "published" ? "public" : "moderators";
}
