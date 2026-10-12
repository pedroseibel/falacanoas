import { queryOptions } from "@tanstack/react-query";
import { getCity, getItem, getThreads } from "@/server/data";
import { getAccount } from "@/server/account";
import { getItemViewer } from "@/server/item-actions";
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

export type AccountData = Awaited<ReturnType<typeof getAccount>>;

/** The signed-in person, or null. Invalidate after signing in or out. */
export const accountQuery = queryOptions({
  queryKey: ["account"],
  queryFn: () => getAccount(),
  staleTime: 30_000,
});

/** What the signed-in neighbour already did with an item (confirmed, follows…); null when signed out. */
export const itemViewerQuery = (id: string) =>
  queryOptions({ queryKey: ["item", id, "viewer"], queryFn: () => getItemViewer({ data: id }), staleTime: 30_000 });

/**
 * Where someone must go before writing anything (round 18, nível 1): sign in with a phone, then
 * choose an apelido. Null when they can write.
 */
export const memberGate = (account: AccountData) =>
  !account || account.guest || !account.phoneVerified ? "/entrar" : !account.nick ? "/bem-vindo" : null;
