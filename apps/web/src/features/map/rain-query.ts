import { localTime } from "@fala/core";
import { queryOptions } from "@tanstack/react-query";
import { getRainNow } from "@/server/rain-now";

/**
 * "Chuva agora" (DECISIONS round 23): the gauges from the archive, refreshed every 10 minutes. Shared by
 * the map's panel and the flooding records, so one fetch serves both.
 */
export const rainNowQuery = queryOptions({
  queryKey: ["chuva-agora"],
  queryFn: () => getRainNow(),
  refetchInterval: 10 * 60_000,
  staleTime: 5 * 60_000,
});

/** "15:10" on the municipality's clock. */
export function clock(iso: string, timezone: string) {
  const t = localTime(new Date(iso), timezone);
  return `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`;
}
