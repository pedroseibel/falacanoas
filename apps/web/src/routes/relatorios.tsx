import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AuthSearchSchema, returnPath } from "@/features/auth/auth-search";
import { MonthlyPage } from "@/features/monthly/monthly-page";
import { monthlyReportsQuery } from "@/lib/city";
import { useBackLink } from "./-auth-links";

export const Route = createFileRoute("/relatorios")({
  validateSearch: AuthSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(monthlyReportsQuery),
  head: () => ({ meta: [{ title: "Relatórios mensais · Fala, Canoas" }] }),
  component: RelatoriosRoute,
});

function RelatoriosRoute() {
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(monthlyReportsQuery);
  return <MonthlyPage back={useBackLink(returnPath(search))} reports={data} />;
}
