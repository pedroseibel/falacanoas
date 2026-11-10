import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { accountQuery, memberGate } from "@/lib/account";
import { itemKey, itemQuery } from "@/lib/city";
import { getPinThread } from "@/server/forum";
import { getItemViewer } from "@/server/item-actions";
import { getDecision, getMyRemovals } from "@/server/moderation";

/** What the signed-in neighbour already did with an item (confirmed, follows…); null when signed out. */
export const itemViewerQuery = (id: string) =>
  queryOptions({ queryKey: itemKey(id, "viewer"), queryFn: () => getItemViewer({ data: id }), staleTime: 30_000 });

/** A pin's conversation, or null if nobody has started it. */
export const pinThreadQuery = (id: string) =>
  queryOptions({ queryKey: itemKey(id, "thread"), queryFn: () => getPinThread({ data: id }), staleTime: 30_000 });

/** Moderation's decision on a refused item, for whoever posted it. */
export const decisionQuery = (id: string) =>
  queryOptions({ queryKey: itemKey(id, "decision"), queryFn: () => getDecision({ data: id }) });

/** This person's photos and updates that moderation removed from an item. */
export const removalsQuery = (id: string) =>
  queryOptions({ queryKey: itemKey(id, "removals"), queryFn: () => getMyRemovals({ data: id }), staleTime: 30_000 });

/**
 * Everything a pin's panel asks for, started together: the item with its history, its conversation
 * and, for a neighbour who can act, what they already did with it. Left to the panel, the last two
 * would start only once the item had arrived, a round trip later. Fresh data is reused, not refetched.
 */
export function prefetchPin(queryClient: QueryClient, id: string) {
  void queryClient.prefetchQuery(itemQuery(id));
  void queryClient.prefetchQuery(pinThreadQuery(id));
  if (memberGate(queryClient.getQueryData(accountQuery.queryKey) ?? null) === null)
    void queryClient.prefetchQuery(itemViewerQuery(id));
}
