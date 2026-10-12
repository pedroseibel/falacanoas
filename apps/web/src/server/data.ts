import { createServerFn } from "@tanstack/react-start";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { findItem, listItems } from "./items";

/**
 * Data access. Items live in Postgres (Supabase, São Paulo); the fictional demo items are seeded rows
 * marked demo. The viewer and the forum threads are still fixtures. Keep every read and write in
 * src/server so the client never imports a data source.
 */
export const getCity = createServerFn({ method: "GET" }).handler(async () => {
  const now = new Date();
  return { now: now.toISOString(), viewer: fixtures.viewer, items: await listItems(now) };
});

export const getItem = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id.toUpperCase().slice(0, 12))
  .handler(async ({ data }) => findItem(data));

export const getThreads = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug.slice(0, 60))
  .handler(async ({ data }) => fixtures.threads[data] ?? []);
