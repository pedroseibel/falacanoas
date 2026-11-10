import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthSearchSchema, REASON, returnPath } from "@/features/auth/auth-search";
import { SignInPage } from "@/features/auth/sign-in-page";
import { openReport } from "@/features/report/report-store";
import { accountQuery } from "@/lib/account";
import { authClient } from "@/lib/auth-client";
import { getAccount, getAuthConfig } from "@/server/account";
import { useBackLink } from "./-links";

export const Route = createFileRoute("/entrar")({
  validateSearch: AuthSearchSchema,
  // Already signed in: skip ahead.
  beforeLoad: async ({ context, search }) => {
    const account = await context.queryClient.ensureQueryData(accountQuery);
    if (!account || account.guest || !account.phoneVerified) return;
    if (!account.nick) throw redirect({ to: "/bem-vindo", search, replace: true });
    // Signed in already (another tab, an earlier visit): still do what they came for. Client only:
    // the report store is per browser, never per server.
    if (search.depois === "registrar" && typeof window !== "undefined") openReport();
    throw redirect({ href: returnPath(search), replace: true });
  },
  loader: () => getAuthConfig(),
  head: () => ({ meta: [{ title: "Entrar · Fala, Canoas" }, { name: "robots", content: "noindex" }] }),
  component: EntrarRoute,
});

function EntrarRoute() {
  const search = Route.useSearch();
  const { turnstileSiteKey } = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const back = useBackLink(returnPath(search));
  return (
    <SignInPage
      reason={search.depois ? REASON[search.depois] : null}
      back={back}
      turnstileSiteKey={turnstileSiteKey}
      onGuest={
        search.depois === "registrar"
          ? async () => {
              // A guest session already open (an earlier guest pin) is reused; Better Auth won't open a second.
              if (!queryClient.getQueryData(accountQuery.queryKey)?.guest) {
                const r = await authClient.signIn.anonymous();
                if (r.error) throw new Error(r.error.message);
              }
              queryClient.setQueryData(accountQuery.queryKey, await getAccount());
              openReport();
              void navigate({ href: returnPath(search), replace: true });
            }
          : undefined
      }
      onDone={(account) => {
        if (!account.nick) return void navigate({ to: "/bem-vindo", search, replace: true });
        if (search.depois === "registrar") openReport();
        void navigate({ href: returnPath(search), replace: true });
        toast(`Que bom te ver, ${account.nick}.`);
      }}
    />
  );
}
