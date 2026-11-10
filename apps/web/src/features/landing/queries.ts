import { queryOptions } from "@tanstack/react-query";
import { getQueue } from "@/server/queue";

export const queueQuery = queryOptions({
  queryKey: ["queue"],
  queryFn: () => getQueue(),
  staleTime: 60_000,
});
