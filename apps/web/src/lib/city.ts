import { queryOptions } from "@tanstack/react-query";
import { getCity, getItem, getThreads } from "@/server/data";

/** Server state lives in TanStack Query. Loaders prefetch, components read. */
export const cityQuery = queryOptions({
  queryKey: ["city"],
  queryFn: () => getCity(),
  staleTime: 60_000,
});

export const itemQuery = (id: string) =>
  queryOptions({ queryKey: ["item", id], queryFn: () => getItem({ data: id }), staleTime: 60_000 });

export const threadsQuery = (slug: string) =>
  queryOptions({ queryKey: ["threads", slug], queryFn: () => getThreads({ data: slug }), staleTime: 60_000 });
