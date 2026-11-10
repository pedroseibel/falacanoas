import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Q } from "./db/client";
import { itemAuthors, itemEvents, itemPhotos, moderationCases } from "./db/schema";

/**
 * What a moderation case is about, and who is behind it: asked in plain code (one case in hand) and
 * inside queries (many cases at once), from this one place. Server-only.
 */

type CaseRow = typeof moderationCases.$inferSelect;

export const aboutItem = and(isNull(moderationCases.photoId), isNull(moderationCases.eventId));
/** A case decided against its target: refused, or sent back to be republished signed. */
export const isRemoval = inArray(moderationCases.status, ["rejected", "republish"]);

/**
 * `targetAccount` inside a query over moderation_cases: left-join item_photos and item_events on the
 * case's photo and update, and `caseAuthor` on `caseAuthorOn`; then this is the account.
 */
export const caseAuthor = alias(itemAuthors, "case_author");
export const caseAuthorOn = and(eq(caseAuthor.itemId, moderationCases.itemId), aboutItem);
export const targetAccountSql = sql<
  string | null
>`coalesce(${itemPhotos.accountId}, ${itemEvents.accountId}, ${caseAuthor.accountId})`;

/**
 * The account behind what a case is about: who sent the photo, who wrote the update, or who posted the
 * item. Never leaves the server: it decides who can contest, and whose refusals a moderator counts.
 */
export async function targetAccount(q: Q, c: Pick<CaseRow, "itemId" | "photoId" | "eventId">): Promise<string | null> {
  if (c.photoId) {
    const [p] = await q.select({ a: itemPhotos.accountId }).from(itemPhotos).where(eq(itemPhotos.id, c.photoId));
    return p?.a ?? null;
  }
  if (c.eventId) {
    const [e] = await q.select({ a: itemEvents.accountId }).from(itemEvents).where(eq(itemEvents.id, c.eventId));
    return e?.a ?? null;
  }
  const [a] = await q.select({ a: itemAuthors.accountId }).from(itemAuthors).where(eq(itemAuthors.itemId, c.itemId));
  return a?.a ?? null;
}
