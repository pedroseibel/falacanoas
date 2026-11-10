import { canoas } from "@fala/instance-canoas";
import {
  DAY_MS,
  dueForMute,
  localDay,
  MUTE_DAYS,
  type RemovalWeight,
  type SanctionState,
  standing,
  type Standing,
  STRIKE_WINDOW_DAYS,
} from "@fala/core";
import { and, eq, gt, isNull, ne, or } from "drizzle-orm";
import type { Q } from "./db/client";
import { caseAuthor, caseAuthorOn, isRemoval, targetAccountSql } from "./case-target";
import { itemEvents, itemPhotos, moderationCases, sanctions } from "./db/schema";

/**
 * Sanctions' plain server helpers (DECISIONS round 19), apart from the server functions in
 * sanctions.ts. A removal weighs against whoever sent the thing; enough weight mutes them.
 */

export type SanctionRow = typeof sanctions.$inferSelect;

const toState = (r: SanctionRow): SanctionState => ({
  kind: r.kind,
  startsAt: r.startsAt,
  endsAt: r.endsAt,
  liftedAt: r.liftedAt,
  confirmed: Boolean(r.confirmedAt),
});

export async function standingOf(q: Q, accountId: string, now = new Date()): Promise<Standing> {
  const rows = await q.select().from(sanctions).where(eq(sanctions.accountId, accountId));
  return standing(rows.map(toState), now);
}

/** A date as people read it in Canoas: "12 nov". */
export const dayOf = (d: Date) => localDay(d, canoas.timezone);

/** This account's removals since `since`, with their weight. A contest won takes one off the count. */
export async function removalsOf(q: Q, accountId: string, since: Date): Promise<{ weight: RemovalWeight; at: Date }[]> {
  const rows = await q
    .select({ weight: moderationCases.weight, at: moderationCases.decidedAt })
    .from(moderationCases)
    .leftJoin(itemPhotos, eq(itemPhotos.id, moderationCases.photoId))
    .leftJoin(itemEvents, eq(itemEvents.id, moderationCases.eventId))
    .leftJoin(caseAuthor, caseAuthorOn)
    .where(
      and(
        isRemoval,
        gt(moderationCases.decidedAt, since),
        or(isNull(moderationCases.contestStatus), ne(moderationCases.contestStatus, "overturned")),
        eq(targetAccountSql, accountId),
      ),
    );
  return rows.flatMap((r) => (r.at ? [{ weight: r.weight, at: r.at }] : []));
}

/**
 * After a removal, inside its transaction: one grave removal, or three strikes in 30 days, mute the
 * account for 30 days, unless something at least as strong is already in force.
 */
export async function strike(q: Q, accountId: string | null, now: Date): Promise<void> {
  if (!accountId) return;
  const removals = await removalsOf(q, accountId, new Date(now.getTime() - STRIKE_WINDOW_DAYS * DAY_MS));
  if (!dueForMute(removals, now)) return;
  if ((await standingOf(q, accountId, now)).kind !== "ok") return;
  const grave = removals.some((r) => r.weight === "grave");
  await q.insert(sanctions).values({
    accountId,
    kind: "mute",
    source: "auto",
    reason: grave
      ? "Uma publicação sua foi removida por nudez ou conteúdo sexual."
      : `Três publicações suas foram removidas em ${STRIKE_WINDOW_DAYS} dias.`,
    startsAt: now,
    endsAt: new Date(now.getTime() + MUTE_DAYS * DAY_MS),
    confirmedAt: now,
  });
}

/** After a contest is won: an automatic mute the remaining removals no longer justify is lifted. */
export async function recheck(q: Q, accountId: string | null, now: Date): Promise<void> {
  if (!accountId) return;
  const removals = await removalsOf(q, accountId, new Date(now.getTime() - STRIKE_WINDOW_DAYS * DAY_MS));
  if (dueForMute(removals, now)) return;
  await q
    .update(sanctions)
    .set({ liftedAt: now, liftNote: "Uma das remoções foi revista; o silêncio automático acabou." })
    .where(
      and(
        eq(sanctions.accountId, accountId),
        eq(sanctions.source, "auto"),
        // Only the mute `strike` set: the suspension an escalation sets is automatic too, and stays.
        eq(sanctions.kind, "mute"),
        isNull(sanctions.escalationId),
        isNull(sanctions.liftedAt),
        gt(sanctions.endsAt, now),
      ),
    );
}
