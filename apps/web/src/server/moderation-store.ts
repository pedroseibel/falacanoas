import type { ModerationFlag } from "@fala/core";
import { eq, sql } from "drizzle-orm";
import { db, type Db } from "./db/client";
import { items, moderationCases, moderators } from "./db/schema";

/**
 * Moderation's plain server helpers, apart from the server functions in moderation.ts: a module the
 * browser imports must hold only server functions, or the database client leaks into the bundle.
 */

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Opens a case, giving the item its handle if it has none yet. Runs inside the caller's transaction. */
export async function openCase(
  q: Db | Tx,
  itemId: string,
  reason: "guest_pin" | "prescreen",
  flags: ModerationFlag[],
): Promise<void> {
  const handle = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  await q
    .update(items)
    .set({ moderationHandle: sql`coalesce(${items.moderationHandle}, ${handle})` })
    .where(eq(items.id, itemId));
  await q.insert(moderationCases).values({ itemId, reason, flags });
}

export async function moderatorOf(accountId: string) {
  const [row] = await db.select().from(moderators).where(eq(moderators.accountId, accountId));
  return row ?? null;
}

export async function isModerator(accountId: string): Promise<boolean> {
  return Boolean(await moderatorOf(accountId));
}
