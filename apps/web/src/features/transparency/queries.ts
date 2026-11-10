import { queryOptions } from "@tanstack/react-query";
import { getTransparency } from "@/server/transparency";

/** The transparency report's counts (round 20): public, the same for everyone. */
export const transparencyQuery = queryOptions({
  queryKey: ["transparency"],
  queryFn: () => getTransparency(),
  staleTime: 10 * 60_000,
});
