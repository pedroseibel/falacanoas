import { queryOptions } from "@tanstack/react-query";
import { getCity, getItem, getThreads } from "@/server/data";
import { getAccount } from "@/server/account";
import { getQueue } from "@/server/queue";

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

export const queueQuery = queryOptions({
  queryKey: ["queue"],
  queryFn: () => getQueue(),
  staleTime: 60_000,
});

/** The signed-in person, or null. Invalidate after signing in or out. */
export const accountQuery = queryOptions({
  queryKey: ["account"],
  queryFn: () => getAccount(),
  staleTime: 30_000,
});
