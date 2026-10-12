import { createFileRoute } from "@tanstack/react-router";
import { AuthSearchSchema, returnPath } from "@/features/auth/auth-search";
import { PRIVACY_NOTICE_VERSION } from "@/features/legal/privacy";
import { PrivacyPage } from "@/features/legal/privacy-page";
import { useBackLink } from "./-auth-links";

export const Route = createFileRoute("/privacidade")({
  validateSearch: AuthSearchSchema,
  head: () => ({ meta: [{ title: "Aviso de privacidade do app · Fala, Canoas" }] }),
  component: PrivacidadeRoute,
});

function PrivacidadeRoute() {
  const search = Route.useSearch();
  return <PrivacyPage back={useBackLink(returnPath(search))} version={PRIVACY_NOTICE_VERSION} />;
}
