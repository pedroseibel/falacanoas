import { queryOptions } from "@tanstack/react-query";
import { getThreads } from "@/server/forum";

export const threadsQuery = (slug: string) =>
  queryOptions({ queryKey: ["threads", slug], queryFn: () => getThreads({ data: slug }), staleTime: 60_000 });
