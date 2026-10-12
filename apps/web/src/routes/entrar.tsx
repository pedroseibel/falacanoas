import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthSearchSchema, REASON, returnPath } from "@/features/auth/auth-search";
import { SignInPage } from "@/features/auth/sign-in-page";
import { openReport } from "@/features/report/report-store";
import { accountQuery } from "@/lib/city";
import { useBackLink } from "./-auth-links";

export const Route = createFileRoute("/entrar")({
  validateSearch: AuthSearchSchema,
  // Already signed in: skip ahead.
  beforeLoad: async ({ context, search }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery);
    if (!account || account.guest || !account.phoneVerified) return;
    if (!account.nick) throw redirect({ to: "/bem-vindo", search, replace: true });
    throw redirect({ href: returnPath(search), replace: true });
  },
  head: () => ({ meta: [{ title: "Entrar · Fala, Canoas" }, { name: "robots", content: "noindex" }] }),
  component: EntrarRoute,
});

function EntrarRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const back = useBackLink(returnPath(search));
  return (
    <SignInPage
      reason={search.depois ? REASON[search.depois] : null}
      back={back}
      onDone={(account) => {
        if (!account.nick) return void navigate({ to: "/bem-vindo", search, replace: true });
        if (search.depois === "registrar") openReport();
        void navigate({ href: returnPath(search), replace: true });
        toast(`Que bom te ver, ${account.nick}.`);
      }}
    />
  );
}
