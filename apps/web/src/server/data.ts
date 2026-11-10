import { ItemIdSchema } from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { z } from "zod";
import { findVisibleItem, listItems } from "./items";
import { getSession } from "./session";

/**
 * Data access. Items live in Postgres (Supabase, São Paulo); the fictional demo items are seeded rows
 * marked demo. The viewer is still a fixture. Keep every read and write in
 * src/server so the client never imports a data source.
 */
export const getCity = createServerFn({ method: "GET" }).handler(async () => {
  const now = new Date();
  return { now: now.toISOString(), viewer: fixtures.viewer, items: await listItems(now) };
});

/** One item. A guest pin still in moderation needs its tracking key, or the session that dropped it. */
export const getItem = createServerFn({ method: "GET" })
  .validator(z.object({ id: ItemIdSchema, key: z.string().max(64).nullable() }))
  .handler(async ({ data }) => {
    return findVisibleItem(data.id, {
      key: data.key,
      accountId: async () => (await getSession())?.user?.id ?? null,
    });
  });
