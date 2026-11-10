import { queryOptions } from "@tanstack/react-query";
import { getMonthlyReports } from "@/server/monthly";

/** The monthly reports built so far: public, the same for everyone. */
export const monthlyReportsQuery = queryOptions({
  queryKey: ["monthly-reports"],
  queryFn: () => getMonthlyReports(),
  staleTime: 60 * 60_000,
});
