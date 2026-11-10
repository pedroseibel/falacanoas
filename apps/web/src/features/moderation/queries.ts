import { queryOptions } from "@tanstack/react-query";
import { getReportedPosts } from "@/server/forum";
import { getAwaitingCheck, getIsModerator, getModerationQueue } from "@/server/moderation";
import { getSanctionQueue } from "@/server/sanctions";
import { getModerationStanding } from "@/server/volunteers";

/**
 * Everything moderation caches sits under this key. A decision can move a case between the queues
 * below, so whatever changes one of them invalidates them all.
 */
export const MODERATION_KEY = ["moderation"];

/** The moderation queue (null when the person doesn't moderate). */
export const moderationQueueQuery = queryOptions({
  queryKey: [...MODERATION_KEY, "queue"],
  queryFn: () => getModerationQueue(),
  staleTime: 15_000,
});

/** New photos waiting for the known-material check (null when it isn't required, or for non-moderators). */
export const awaitingCheckQuery = queryOptions({
  queryKey: [...MODERATION_KEY, "awaiting-check"],
  queryFn: () => getAwaitingCheck(),
  staleTime: 15_000,
});

/** Whether the signed-in person moderates, for the link in Você and the takedown in "Denunciar". */
export const isModeratorQuery = queryOptions({
  queryKey: [...MODERATION_KEY, "moderator"],
  queryFn: () => getIsModerator(),
  staleTime: 60_000,
});

/** Whether the person moderates (and accepted the current guide), or their request to; null when they can't ask. */
export const moderationStandingQuery = queryOptions({
  queryKey: [...MODERATION_KEY, "standing"],
  queryFn: () => getModerationStanding(),
  staleTime: 30_000,
});

export const reportedPostsQuery = queryOptions({
  queryKey: [...MODERATION_KEY, "posts"],
  queryFn: () => getReportedPosts(),
  staleTime: 15_000,
});

/** Suspensions to confirm and contested sanctions, for moderators (null for anyone else). */
export const sanctionQueueQuery = queryOptions({
  queryKey: [...MODERATION_KEY, "sanctions"],
  queryFn: () => getSanctionQueue(),
  staleTime: 15_000,
});
