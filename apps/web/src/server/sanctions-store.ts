import { canoas } from "@fala/instance-canoas";
import {
  dueForMute,
  localStamp,
  MUTE_DAYS,
  standing,
  standingMessage,
  STRIKE_WINDOW_DAYS,
  type RemovalWeight,
  type SanctionState,
  type Standing,
} from "@fala/core";
import { and, eq, gt, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type Db } from "./db/client";
import { itemAuthors, itemEvents, itemPhotos, moderationCases, sanctions } from "./db/schema";

/**
 * Sanctions' plain server helpers (DECISIONS round 19), apart from the server functions in
 * sanctions.ts. A removal weighs against whoever sent the thing; enough weight mutes them.
 */

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Q = Db | Tx;
export type SanctionRow = typeof sanctions.$inferSelect;

const DAY = 86_400_000;

export const toState = (r: SanctionRow): SanctionState => ({
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
export const dayOf = (d: Date) => localStamp(d, canoas.timezone).split(" · ")[0] ?? "";

/** What a muted or suspended person reads when they try to post; null when they're free to. */
export async function standingRefusal(accountId: string, now = new Date()): Promise<string | null> {
  const s = await standingOf(db, accountId, now);
  return s.kind === "ok" ? null : standingMessage(s, dayOf);
}

const strikeAuthor = alias(itemAuthors, "strike_author");
const targetAccount = sql`coalesce(${itemPhotos.accountId}, ${itemEvents.accountId}, ${strikeAuthor.accountId})`;

/** This account's removals since `since`, with their weight. A contest won takes one off the count. */
export async function removalsOf(q: Q, accountId: string, since: Date): Promise<{ weight: RemovalWeight; at: Date }[]> {
  const rows = await q
    .select({ weight: moderationCases.weight, at: moderationCases.decidedAt })
    .from(moderationCases)
    .leftJoin(itemPhotos, eq(itemPhotos.id, moderationCases.photoId))
    .leftJoin(itemEvents, eq(itemEvents.id, moderationCases.eventId))
    .leftJoin(
      strikeAuthor,
      and(
        eq(strikeAuthor.itemId, moderationCases.itemId),
        isNull(moderationCases.photoId),
        isNull(moderationCases.eventId),
      ),
    )
    .where(
      and(
        inArray(moderationCases.status, ["rejected", "republish"]),
        gt(moderationCases.decidedAt, since),
        or(isNull(moderationCases.contestStatus), ne(moderationCases.contestStatus, "overturned")),
        sql`${targetAccount} = ${accountId}`,
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
  const removals = await removalsOf(q, accountId, new Date(now.getTime() - STRIKE_WINDOW_DAYS * DAY));
  if (!dueForMute(removals, now)) return;
  if ((await standingOf(q, accountId, now)).kind !== "ok") return;
  const grave = removals.some((r) => r.weight === "grave");
  await q.insert(sanctions).values({
    accountId,
    kind: "mute",
    source: "auto",
    reason: grave
      ? "Uma publicação sua foi removida por nudez ou conteúdo sexual."
      : "Três publicações suas foram removidas em 30 dias.",
    startsAt: now,
    endsAt: new Date(now.getTime() + MUTE_DAYS * DAY),
    confirmedAt: now,
  });
}

/** After a contest is won: an automatic mute the remaining removals no longer justify is lifted. */
export async function recheck(q: Q, accountId: string | null, now: Date): Promise<void> {
  if (!accountId) return;
  const removals = await removalsOf(q, accountId, new Date(now.getTime() - STRIKE_WINDOW_DAYS * DAY));
  if (dueForMute(removals, now)) return;
  await q
    .update(sanctions)
    .set({ liftedAt: now, liftNote: "Uma das remoções foi revista; o silêncio automático acabou." })
    .where(
      and(
        eq(sanctions.accountId, accountId),
        eq(sanctions.source, "auto"),
        isNull(sanctions.liftedAt),
        gt(sanctions.endsAt, now),
      ),
    );
}
