import { Link, Outlet, createFileRoute, useMatchRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { openSignIn } from "@/features/auth/auth-store";
import { SignInDialog } from "@/features/auth/sign-in-dialog";
import { AppShell, type Section } from "@/features/shell/app-shell";
import { accountQuery, cityQuery } from "@/lib/city";

export const Route = createFileRoute("/_app")({
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(cityQuery), context.queryClient.ensureQueryData(accountQuery)]),
  component: AppLayout,
});

const PATH: Record<Section, "/mapa" | "/placar" | "/bairro" | "/voce"> = {
  mapa: "/mapa",
  placar: "/placar",
  bairro: "/bairro",
  voce: "/voce",
};

function AppLayout() {
  const match = useMatchRoute();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const section: Section = match({ to: "/placar" })
    ? "placar"
    : match({ to: "/bairro", fuzzy: true })
      ? "bairro"
      : match({ to: "/voce" })
        ? "voce"
        : "mapa";
  const onQuery = useDebouncedCallback(
    (q: string) => void navigate({ to: "/mapa", search: (prev) => ({ ...prev, q: q.trim() || undefined }) }),
    { wait: 250 },
  );
  const { data: account } = useSuspenseQuery(accountQuery);
  return (
    <AppShell
      section={section}
      query={typeof search.q === "string" ? search.q : ""}
      onQuery={onQuery}
      signedIn={Boolean(account && !account.guest)}
      nick={account?.nick ?? null}
      onSignIn={() => openSignIn()}
      onReport={() =>
        account?.phoneVerified
          ? toast("O fluxo de registro é o próximo passo desta versão.")
          : openSignIn("Para registrar um problema, entre com o seu celular. Mandamos um código pelo WhatsApp.")
      }
      link={(to, children, className, current) => (
        <Link key={to} to={PATH[to]} className={className} aria-current={current ? "page" : undefined}>
          {children}
        </Link>
      )}
    >
      <Outlet />
      <SignInDialog />
    </AppShell>
  );
}
