import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { VocePage } from "@/features/voce/voce-page";
import { cityQuery } from "@/lib/city";

export const Route = createFileRoute("/_app/voce")({
  loader: ({ context }) => context.queryClient.ensureQueryData(cityQuery),
  head: () => ({ meta: [{ title: "Você · Fala, Canoas" }] }),
  component: VoceRoute,
});

function VoceRoute() {
  const { data: city } = useSuspenseQuery(cityQuery);
  const navigate = useNavigate();
  return (
    <VocePage
      viewer={city.viewer}
      muni={canoas}
      items={city.items}
      onOpen={(id) => void navigate({ to: "/o/$id", params: { id } })}
    />
  );
}
