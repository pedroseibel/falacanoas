import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { getCity, getItem } from "@/server/data";
import { getPinThread, getReportedPosts, getThreads } from "@/server/forum";
import { getAccount, getAuthConfig } from "@/server/account";
import { getFollowing } from "@/server/follows";
import { getItemViewer } from "@/server/item-actions";
import { getAwaitingCheck, getIsModerator, getModerationQueue } from "@/server/moderation";
import { getQueue } from "@/server/queue";
import { getMySanctions, getSanctionQueue } from "@/server/sanctions";
import { getTransparency } from "@/server/transparency";
import { getMonthlyReports } from "@/server/monthly";
import { getModerationStanding } from "@/server/volunteers";

/** Server state lives in TanStack Query. Loaders prefetch, components read. */
export const cityQuery = queryOptions({
  queryKey: ["city"],
  queryFn: () => getCity(),
  staleTime: 60_000,
});

/** One item; `key` opens a guest pin still in moderation (its tracking link). */
export const itemQuery = (id: string, key: string | null = null) =>
  queryOptions({ queryKey: ["item", id], queryFn: () => getItem({ data: { id, key } }), staleTime: 60_000 });

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

/** Places and pins the signed-in neighbour follows, and what they registered; null when signed out. */
export const followingQuery = queryOptions({
  queryKey: ["following"],
  queryFn: () => getFollowing(),
  staleTime: 30_000,
});

/** Public sign-in settings (the Turnstile site key), shared by /entrar and the guest report form. */
export const authConfigQuery = queryOptions({
  queryKey: ["auth-config"],
  queryFn: () => getAuthConfig(),
  staleTime: Infinity,
});

/** The moderation queue (null when the person doesn't moderate). */
export const moderationQueueQuery = queryOptions({
  queryKey: ["moderation"],
  queryFn: () => getModerationQueue(),
  staleTime: 15_000,
});

/** New photos waiting for the known-material check (null when it isn't required, or for non-moderators). */
export const awaitingCheckQuery = queryOptions({
  queryKey: ["moderation", "awaiting-check"],
  queryFn: () => getAwaitingCheck(),
  staleTime: 15_000,
});

export const isModeratorQuery = queryOptions({
  queryKey: ["moderator"],
  queryFn: () => getIsModerator(),
  staleTime: 60_000,
});

/** Whether the person moderates (and accepted the current guide), or their request to; null when they can't ask. */
export const moderationStandingQuery = queryOptions({
  queryKey: ["moderation", "standing"],
  queryFn: () => getModerationStanding(),
  staleTime: 30_000,
});

/** A pin's conversation, or null if nobody has started it. */
export const pinThreadQuery = (id: string) =>
  queryOptions({ queryKey: ["item", id, "thread"], queryFn: () => getPinThread({ data: id }), staleTime: 30_000 });

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

/** Reported forum posts, for moderators. */
export const reportedPostsQuery = queryOptions({
  queryKey: ["moderation", "posts"],
  queryFn: () => getReportedPosts(),
  staleTime: 15_000,
});

/** Suspensions to confirm and contested sanctions, for moderators (null for anyone else). */
export const sanctionQueueQuery = queryOptions({
  queryKey: ["moderation", "sanctions"],
  queryFn: () => getSanctionQueue(),
  staleTime: 15_000,
});

/** The signed-in person's sanctions in force (round 19), for Você. */
export const mySanctionsQuery = queryOptions({
  queryKey: ["account", "sanctions"],
  queryFn: () => getMySanctions(),
  staleTime: 30_000,
});

/** The transparency report's counts (round 20): public, the same for everyone. */
export const monthlyReportsQuery = queryOptions({
  queryKey: ["monthly-reports"],
  queryFn: () => getMonthlyReports(),
  staleTime: 60 * 60_000,
});

export const transparencyQuery = queryOptions({
  queryKey: ["transparency"],
  queryFn: () => getTransparency(),
  staleTime: 10 * 60_000,
});
