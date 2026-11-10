import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthSearchSchema, returnPath } from "@/features/auth/auth-search";
import { WelcomePage } from "@/features/auth/welcome-page";
import { openReport } from "@/features/report/report-store";
import { accountQuery } from "@/lib/account";
import { useBackLink } from "./-links";

export const Route = createFileRoute("/bem-vindo")({
  validateSearch: AuthSearchSchema,
  // An apelido needs a phone-verified account first.
  beforeLoad: async ({ context, search }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery);
    if (!account || account.guest || !account.phoneVerified) throw redirect({ to: "/entrar", search, replace: true });
  },
  head: () => ({ meta: [{ title: "Como você quer aparecer · Fala, Canoas" }, { name: "robots", content: "noindex" }] }),
  component: BemVindoRoute,
});

function BemVindoRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: account } = useSuspenseQuery(accountQuery);
  const back = useBackLink(returnPath(search));
  if (!account) return null;
  return (
    <WelcomePage
      account={account}
      back={back}
      onDone={(nick) => {
        if (search.depois === "registrar") openReport();
        void navigate({ href: returnPath(search), replace: true });
        toast(`Pronto. Você aparece como ${nick}.`);
      }}
    />
  );
}
