import { createServerFn } from "@tanstack/react-start";
import { fixtures } from "@fala/instance-canoas/fixtures";

/**
 * Data access. Today: fixtures (fictional data). Tomorrow: Supabase (São Paulo) behind the same functions.
 * Keep every read and write here so the client never imports a data source directly.
 */
export const getCity = createServerFn({ method: "GET" }).handler(async () => ({
  now: fixtures.now,
  viewer: fixtures.viewer,
  items: fixtures.items,
}));

export const getItem = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id.toUpperCase().slice(0, 12))
  .handler(async ({ data }) => fixtures.items.find((i) => i.id === data) ?? null);

export const getThreads = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug.slice(0, 60))
  .handler(async ({ data }) => fixtures.threads[data] ?? []);
