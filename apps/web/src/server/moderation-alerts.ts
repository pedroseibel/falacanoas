import { moderationWaitingNotice } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import type { Db } from "./db/client";
import { itemPhotos, items, moderationCases, moderators, photoScreens } from "./db/schema";
import { hashMatchingRequired, visibleToModerators } from "./known-material";
import { deliverTo } from "./push-send";

/**
 * When moderation falls behind (moderation capacity): cases that have waited longer than WAIT_HOURS
 * bring a push to the moderators of their bairros, at most once every QUIET_HOURS each. Run by the
 * ten-minute job. Photos still waiting for the known-material check don't count: no one can see them.
 * Server-only.
 */
export const WAIT_HOURS = 3;
export const QUIET_HOURS = 6;
const HOUR = 3_600_000;

/** Bairro slug → how many cases there have waited too long. */
export async function waitingByBairro(q: Db, now: Date): Promise<Map<string, number>> {
  const rows = await q
    .select({
      neighborhood: items.neighborhood,
      review: itemPhotos.review,
      known: photoScreens.known,
      knownReview: photoScreens.knownReview,
      photoId: moderationCases.photoId,
    })
    .from(moderationCases)
    .innerJoin(items, eq(items.id, moderationCases.itemId))
    .leftJoin(itemPhotos, eq(itemPhotos.id, moderationCases.photoId))
    .leftJoin(photoScreens, eq(photoScreens.storageKey, itemPhotos.storageKey))
    .where(
      and(
        or(eq(moderationCases.status, "open"), eq(moderationCases.contestStatus, "open")),
        lt(moderationCases.createdAt, new Date(now.getTime() - WAIT_HOURS * HOUR)),
      ),
    );
  const required = hashMatchingRequired();
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.neighborhood) continue;
    if (r.photoId && r.review && !visibleToModerators(r.review, r, required)) continue;
    out.set(r.neighborhood, (out.get(r.neighborhood) ?? 0) + 1);
  }
  return out;
}

/** Pushes to the moderators who have waiting cases in their bairros and haven't heard recently. */
export async function alertWaiting(q: Db, now: Date): Promise<number> {
  const waiting = await waitingByBairro(q, now);
  if (!waiting.size) return 0;
  const due = await q
    .select()
    .from(moderators)
    .where(or(isNull(moderators.alertedAt), lt(moderators.alertedAt, new Date(now.getTime() - QUIET_HOURS * HOUR))));
  let sent = 0;
  for (const m of due) {
    const theirs = [...waiting].filter(([slug]) => !m.neighborhoods || m.neighborhoods.includes(slug));
    if (!theirs.length) continue;
    const notice = moderationWaitingNotice(
      theirs.map(([slug, count]) => ({
        bairro: canoas.neighborhoods.find((n) => n.slug === slug)?.name ?? slug,
        count,
      })),
      WAIT_HOURS,
    );
    // oxlint-disable-next-line no-await-in-loop
    await deliverTo(q, [m.accountId], notice);
    // oxlint-disable-next-line no-await-in-loop
    await q.update(moderators).set({ alertedAt: now }).where(eq(moderators.accountId, m.accountId));
    sent++;
  }
  return sent;
}
