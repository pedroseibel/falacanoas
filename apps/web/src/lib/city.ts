import type { Item } from "@fala/core";
import { queryOptions, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getCity, getItem } from "@/server/data";

/** Server state lives in TanStack Query. Loaders prefetch, components read. */
export const cityQuery = queryOptions({
  queryKey: ["city"],
  queryFn: () => getCity(),
  staleTime: 60_000,
});

/**
 * Everything cached about one item sits under its key: the item itself, then what each feature keeps
 * about it ("viewer", "thread", "decision", "removals"). Invalidating `itemKey(id)` refreshes it all.
 */
export const itemKey = (id: string, ...part: string[]) => ["item", id, ...part];

/** One item; `key` opens a guest pin still in moderation (its tracking link). */
export const itemQuery = (id: string, key: string | null = null) =>
  queryOptions({ queryKey: itemKey(id), queryFn: () => getItem({ data: { id, key } }), staleTime: 60_000 });

/**
 * Puts an item in the cache: its own entry and its place in the city's list (the list's copy has no
 * history; a new item goes first). `full: false` is for a copy without its history (the list's own,
 * or a guess): it never stands in for an entry that isn't loaded yet.
 */
function cacheItem(queryClient: QueryClient, item: Item, { full = true } = {}): void {
  const key = itemQuery(item.id).queryKey;
  if (full || queryClient.getQueryData(key)) queryClient.setQueryData(key, item);
  queryClient.setQueryData(cityQuery.queryKey, (city) => {
    if (!city) return city;
    const listed = { ...item, events: undefined };
    const known = city.items.some((i) => i.id === item.id);
    return { ...city, items: known ? city.items.map((i) => (i.id === item.id ? listed : i)) : [listed, ...city.items] };
  });
}

/**
 * Shows a new or changed item everywhere at once: the page, the rail and the map. The map draws from
 * its own store, which the map route refills when the router runs it again, so both happen here.
 */
export function useShowItem() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (item: Item, opts?: { full?: boolean }) => {
    cacheItem(queryClient, item, opts);
    void router.invalidate();
  };
}
