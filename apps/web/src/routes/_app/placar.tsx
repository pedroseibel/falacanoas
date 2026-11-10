import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { z } from "zod";
import { PlacarPage } from "@/features/placar/placar-page";
import { PlacarViewSchema } from "@/features/placar/placar-model";
import { cityQuery } from "@/lib/city";

export const Route = createFileRoute("/_app/placar")({
  validateSearch: z.object({ view: PlacarViewSchema.optional().catch(undefined) }),
  loader: ({ context }) => context.queryClient.ensureQueryData(cityQuery),
  head: () => ({ meta: [{ title: "Placar · Fala, Canoas" }] }),
  component: PlacarRoute,
});

function PlacarRoute() {
  const { data: city } = useSuspenseQuery(cityQuery);
  const { view = "tipo" } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <PlacarPage
      items={city.items}
      muni={canoas}
      view={view}
      onView={(v) => void navigate({ to: ".", search: { view: v === "tipo" ? undefined : v }, replace: true })}
      onBairro={(slug) => void navigate({ to: "/bairro/$slug", params: { slug } })}
    />
  );
}
