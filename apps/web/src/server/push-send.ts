import {
  covers,
  followLabel,
  FollowPlaceSchema,
  itemNotice,
  newItemNotice,
  type Item,
  type ItemChange,
  type Notice,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { and, eq, inArray, ne } from "drizzle-orm";
import { inBackground } from "./background";
import { db } from "./db/client";
import { follows, itemFollows, pushSubscriptions } from "./db/schema";
import { sendPush, type Vapid } from "./web-push";

/**
 * Who hears about what (DECISIONS round 15; BUILD 4.2), sent by web push after the response. Plain
 * server helpers: only server functions call them. Without VAPID keys nothing is sent.
 */

function vapid(): Vapid | null {
  const privateJwk = process.env.VAPID_PRIVATE_KEY;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  return privateJwk && publicKey
    ? { privateJwk, publicKey, subject: `mailto:contato@${canoas.branding.domain}` }
    : null;
}

/** Sends to every browser of these accounts, and drops the subscriptions that are gone. */
async function deliver(accountIds: string[], notice: Notice): Promise<void> {
  const keys = vapid();
  if (!keys || !accountIds.length) return;
  const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.accountId, accountIds));
  // The tag doubles as the push "topic": a newer notice about the pin replaces an undelivered one.
  const outcomes = await Promise.all(subs.map((s) => sendPush(s, notice, keys, { topic: notice.tag })));
  const gone = subs.filter((_, i) => outcomes[i] === "gone").map((s) => s.id);
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
}

/** Something happened to a pin: everyone following it hears, except whoever did it. */
export function notifyFollowers(it: Item, actorId: string, change: ItemChange): void {
  inBackground(
    "aviso de registro",
    (async () => {
      const rows = await db
        .select({ accountId: itemFollows.accountId })
        .from(itemFollows)
        .where(and(eq(itemFollows.itemId, it.id), ne(itemFollows.accountId, actorId)));
      await deliver(
        rows.map((r) => r.accountId),
        itemNotice(it, change),
      );
    })(),
  );
}

/** A pin was published: everyone whose followed places hold it hears once, about the first such place. */
export function notifyPlaces(it: Item, authorId: string | null): void {
  inBackground(
    "aviso de lugar",
    (async () => {
      const rows = await db
        .select({ accountId: follows.accountId, place: follows.place })
        .from(follows)
        .where(authorId ? ne(follows.accountId, authorId) : undefined);
      const first = new Map<string, string>();
      for (const r of rows) {
        const place = FollowPlaceSchema.safeParse(r.place);
        if (place.success && covers(place.data, it) && !first.has(r.accountId))
          first.set(r.accountId, followLabel(place.data, canoas).title);
      }
      const category = canoas.categories.find((c) => c.key === it.category)?.label ?? it.category;
      // One notice per place label, each to the accounts that follow such a place.
      const byWhere = new Map<string, string[]>();
      for (const [accountId, where] of first) byWhere.set(where, [...(byWhere.get(where) ?? []), accountId]);
      await Promise.all(
        [...byWhere].map(([where, accountIds]) => deliver(accountIds, newItemNotice(it, { where, category }))),
      );
    })(),
  );
}
