import { inArray, sql } from "drizzle-orm";
import type { Db } from "./db/client";
import { itemPhotos } from "./db/schema";
import { removePhotos } from "./photos";

/**
 * How long a removed photo's bytes are kept (round 20): six months from the removal, the same period
 * the Marco Civil (art. 15) and the ECA Digital (Lei 15.211/2025, art. 27 §3) ask for, so a contest,
 * a court or a preservation request can still reach it. Then the bytes go; the row and the history stay.
 */
export const REMOVED_PHOTO_DAYS = 180;

/**
 * The daily job: removed photos (and photos of pins taken off the map) whose removal is more than six
 * months old lose their bytes. Never one under an open contest, and never one escalated as child abuse:
 * those wait for the controller, who deletes them once an authority confirms it has them.
 */
export async function purgeRemovedPhotos(d: Db, now: Date): Promise<number> {
  const before = new Date(now.getTime() - REMOVED_PHOTO_DAYS * 86_400_000);
  const due = await d.execute<{ id: string; storage_key: string }>(sql`
    select p.id, p.storage_key
      from fala.item_photos p
      join fala.items i on i.id = p.item_id
     where p.purged_at is null
       and p.storage_key is not null
       and (p.review = 'removed' or i.moderation = 'rejected')
       and not exists (
         select 1 from fala.escalations e
          where e.item_id = p.item_id and (e.photo_id = p.id or e.photo_id is null))
       and not exists (
         select 1 from fala.moderation_cases mc
          where mc.contest_status = 'open'
            and (mc.photo_id = p.id or (mc.item_id = p.item_id and mc.photo_id is null and mc.event_id is null)))
       and coalesce(
         (select max(mc.decided_at) from fala.moderation_cases mc
           where mc.photo_id = p.id and mc.status = 'rejected'),
         (select max(mc.decided_at) from fala.moderation_cases mc
           where mc.item_id = p.item_id and mc.photo_id is null and mc.event_id is null
             and mc.status in ('rejected', 'republish'))
       ) < ${before}
     limit 500`);
  if (!due.rows.length) return 0;
  await removePhotos(due.rows.map((r) => r.storage_key));
  await d
    .update(itemPhotos)
    .set({ purgedAt: now })
    .where(
      inArray(
        itemPhotos.id,
        due.rows.map((r) => r.id),
      ),
    );
  return due.rows.length;
}
