import { createServerFn } from "@tanstack/react-start";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { z } from "zod";
import { findVisibleItem, listItems } from "./items";
import { getSession } from "./session";

/**
 * Data access. Items live in Postgres (Supabase, São Paulo); the fictional demo items are seeded rows
 * marked demo. The viewer and the forum threads are still fixtures. Keep every read and write in
 * src/server so the client never imports a data source.
 */
export const getCity = createServerFn({ method: "GET" }).handler(async () => {
  const now = new Date();
  return { now: now.toISOString(), viewer: fixtures.viewer, items: await listItems(now) };
});

/** One item. A guest pin still in moderation needs its tracking key, or the session that dropped it. */
export const getItem = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(4).max(12), key: z.string().max(64).nullable() }))
  .handler(async ({ data }) => {
    const user = (await getSession())?.user;
    return findVisibleItem(data.id.toUpperCase(), { key: data.key, accountId: user?.id ?? null });
  });
