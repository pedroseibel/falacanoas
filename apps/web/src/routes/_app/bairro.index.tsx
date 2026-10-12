import { createFileRoute, redirect } from "@tanstack/react-router";
import { cityQuery } from "@/lib/city";

/** /bairro opens the viewer's own bairro. */
export const Route = createFileRoute("/_app/bairro/")({
  loader: async ({ context }) => {
    const city = await context.queryClient.ensureQueryData(cityQuery);
    throw redirect({ to: "/bairro/$slug", params: { slug: city.viewer.neighborhood }, replace: true });
  },
});
