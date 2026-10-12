import { nickAvailable, nickKey } from "@fala/core";
import { and, eq, ne } from "drizzle-orm";
import { db } from "./db/client";
import { nickReservations } from "./db/schema";

/**
 * Apelido reservations (DECISIONS round 18, Q28) in fala.nick_reservations, keyed by the normalized
 * name so look-alike variants collide. Account ids only; no civil identity.
 */

/**
 * Gives this account the apelido and releases the one it had; false if the name (or a look-alike) is
 * taken. The row is locked while it's judged, so two people can't claim one name at once.
 */
export async function claimNick(nick: string, accountId: string, now = new Date()): Promise<boolean> {
  const key = nickKey(nick);
  return db.transaction(async (tx) => {
    // Make sure a row exists to lock, without taking it from anyone.
    await tx
      .insert(nickReservations)
      .values({ key, ownerId: null, lastOwnerId: accountId, published: false, releasedAt: now })
      .onConflictDoNothing();
    const [held] = await tx.select().from(nickReservations).where(eq(nickReservations.key, key)).for("update");
    const reservation = held
      ? {
          ownerId: held.ownerId,
          lastOwnerId: held.lastOwnerId,
          published: held.published,
          releasedAt: held.releasedAt?.getTime() ?? null,
        }
      : undefined;
    // A row the insert above just created names this account as its last owner, so it's free.
    if (!nickAvailable(reservation, accountId, now.getTime())) return false;
    await tx
      .update(nickReservations)
      .set({ ownerId: null, releasedAt: now })
      .where(and(eq(nickReservations.ownerId, accountId), ne(nickReservations.key, key)));
    await tx
      .update(nickReservations)
      .set({
        ownerId: accountId,
        lastOwnerId: accountId,
        published: held?.lastOwnerId === accountId ? held.published : false,
        releasedAt: null,
      })
      .where(eq(nickReservations.key, key));
    return true;
  });
}

/** The account signed a public contribution with its apelido: that name is never given to anyone else. */
export async function markNickPublished(accountId: string): Promise<void> {
  await db.update(nickReservations).set({ published: true }).where(eq(nickReservations.ownerId, accountId));
}
