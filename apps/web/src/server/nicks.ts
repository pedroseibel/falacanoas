import { nickAvailable, nickKey, type NickReservation } from "@fala/core";

/**
 * Apelido reservations (DECISIONS round 18, Q28), in memory until the database exists. Keyed by the
 * normalized name, so look-alike variants collide. Holds no civil identity, only account ids.
 */
const reservations = new Map<string, NickReservation>();

/** Gives this account the apelido and releases the one it had; false if the name (or a look-alike) is taken. */
export function claimNick(nick: string, accountId: string, now = Date.now()): boolean {
  const key = nickKey(nick);
  const held = reservations.get(key);
  if (!nickAvailable(held, accountId, now)) return false;
  for (const [k, r] of reservations)
    if (k !== key && r.ownerId === accountId) reservations.set(k, { ...r, ownerId: null, releasedAt: now });
  reservations.set(key, {
    ownerId: accountId,
    lastOwnerId: accountId,
    published: held?.lastOwnerId === accountId ? held.published : false,
    releasedAt: null,
  });
  return true;
}

/** The account signed a public contribution with its apelido: that name is never given to anyone else. */
export function markNickPublished(accountId: string) {
  for (const [k, r] of reservations) if (r.ownerId === accountId) reservations.set(k, { ...r, published: true });
}
