import { queryOptions } from "@tanstack/react-query";
import { getFollowing } from "@/server/follows";
import { getMySanctions } from "@/server/sanctions";

/** Places and pins the signed-in neighbour follows, and what they registered; null when signed out. */
export const followingQuery = queryOptions({
  queryKey: ["following"],
  queryFn: () => getFollowing(),
  staleTime: 30_000,
});

/** The signed-in person's sanctions in force (round 19), for Você. */
export const mySanctionsQuery = queryOptions({
  queryKey: ["account", "sanctions"],
  queryFn: () => getMySanctions(),
  staleTime: 30_000,
});
