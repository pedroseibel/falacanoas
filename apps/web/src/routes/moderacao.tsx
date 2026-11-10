import { createFileRoute } from "@tanstack/react-router";
import { AuthSearchSchema, returnPath } from "@/features/auth/auth-search";
import { GuidePage } from "@/features/moderation/moderation-guide";
import { useBackLink } from "./-links";

export const Route = createFileRoute("/moderacao")({
  validateSearch: AuthSearchSchema,
  head: () => ({ meta: [{ title: "Como moderamos · Fala, Canoas" }] }),
  component: ModeracaoRoute,
});

function ModeracaoRoute() {
  const search = Route.useSearch();
  return <GuidePage back={useBackLink(returnPath(search))} />;
}
