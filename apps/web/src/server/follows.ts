import { FollowPlaceSchema, MAX_PLACES, type FollowPlace, type Item } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { follows, itemAuthors, itemFollows, items } from "./db/schema";
import { itemFromRows } from "./items-model";
import { member, type Failure } from "./member";

/**
 * What the signed-in neighbour follows (round 15) and what they registered, for Você. Places are
 * kept as core's FollowPlace; which items they cover is worked out by core's `covers`.
 */

export interface Following {
  places: { id: string; place: FollowPlace }[];
  /** Pins followed one by one. */
  items: Item[];
  /** Everything this account registered, "Anônimo em público" included: only its owner sees this list. */
  mine: Item[];
}

const listRows = async (accountId: string, now: Date) => {
  const [placeRows, followed, authored] = await Promise.all([
    db.select().from(follows).where(eq(follows.accountId, accountId)).orderBy(asc(follows.createdAt)),
    db
      .select({ item: items })
      .from(itemFollows)
      .innerJoin(items, eq(items.id, itemFollows.itemId))
      // A pin held or taken down by moderation is no longer the follower's to read.
      .where(and(eq(itemFollows.accountId, accountId), eq(items.moderation, "published")))
      .orderBy(desc(itemFollows.createdAt)),
    db
      .select({ item: items })
      .from(itemAuthors)
      .innerJoin(items, eq(items.id, itemAuthors.itemId))
      .where(eq(itemAuthors.accountId, accountId))
      .orderBy(desc(items.createdAt)),
  ]);
  const read = (rows: { item: typeof items.$inferSelect }[]) =>
    rows.map((r) => itemFromRows(r.item, { photos: [] }, now, canoas.timezone));
  return {
    // A row that no longer parses (a schema change) is skipped rather than breaking the page.
    places: placeRows.flatMap((r) => {
      const place = FollowPlaceSchema.safeParse(r.place);
      return place.success ? [{ id: r.id, place: place.data }] : [];
    }),
    items: read(followed),
    mine: read(authored),
  };
};

export const getFollowing = createServerFn({ method: "GET" }).handler(async (): Promise<Following | null> => {
  const who = await member("acompanhar");
  if ("error" in who) return null;
  return listRows(who.id, new Date());
});

const same = (a: FollowPlace, b: FollowPlace) =>
  a.kind === b.kind && (a.kind !== "neighborhood" || (b.kind === "neighborhood" && a.neighborhood === b.neighborhood));

export const followPlace = createServerFn({ method: "POST" })
  .validator(FollowPlaceSchema)
  .handler(async ({ data }): Promise<Failure | { ok: true; following: Following }> => {
    const who = await member("acompanhar");
    if ("error" in who) return who;
    const current = await listRows(who.id, new Date());
    if (current.places.length >= MAX_PLACES)
      return { ok: false, error: `Você já acompanha ${MAX_PLACES} lugares. Tire um para pôr outro.` };
    // One home: a new one replaces it. A bairro once.
    const replaced = data.kind === "home" ? current.places.filter((p) => p.place.kind === "home") : [];
    if (data.kind === "neighborhood" && current.places.some((p) => same(p.place, data)))
      return { ok: false, error: "Você já acompanha esse bairro." };
    await db.transaction(async (tx) => {
      for (const r of replaced)
        // oxlint-disable-next-line no-await-in-loop
        await tx.delete(follows).where(and(eq(follows.id, r.id), eq(follows.accountId, who.id)));
      await tx.insert(follows).values({ accountId: who.id, place: data });
    });
    return { ok: true, following: await listRows(who.id, new Date()) };
  });

export const unfollowPlace = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }): Promise<Failure | { ok: true; following: Following }> => {
    const who = await member("acompanhar");
    if ("error" in who) return who;
    await db.delete(follows).where(and(eq(follows.id, data.id), eq(follows.accountId, who.id)));
    return { ok: true, following: await listRows(who.id, new Date()) };
  });
