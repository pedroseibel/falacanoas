import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AuthSearchSchema, returnPath } from "@/features/auth/auth-search";
import { TransparencyPage } from "@/features/transparency/transparency-page";
import { transparencyQuery } from "@/lib/city";
import { useBackLink } from "./-auth-links";

export const Route = createFileRoute("/transparencia")({
  validateSearch: AuthSearchSchema,
  loader: ({ context }) => context.queryClient.ensureQueryData(transparencyQuery),
  head: () => ({ meta: [{ title: "Relatório de transparência · Fala, Canoas" }] }),
  component: TransparenciaRoute,
});

function TransparenciaRoute() {
  const search = Route.useSearch();
  const { data } = useSuspenseQuery(transparencyQuery);
  return <TransparencyPage back={useBackLink(returnPath(search))} data={data} />;
}
