import {
  Link,
  Outlet,
  createFileRoute,
  useMatchRoute,
  useNavigate,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { openSignIn } from "@/features/auth/auth-store";
import { SignInDialog } from "@/features/auth/sign-in-dialog";
import { ReportDialog } from "@/features/report/report-dialog";
import { openReport } from "@/features/report/report-store";
import { AppShell, type Section } from "@/features/shell/app-shell";
import { accountQuery, cityQuery, type AccountData } from "@/lib/city";

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

/** Registrar needs a verified phone and an apelido; sign-in picks up where it was asked for. */
function startReport(account: AccountData) {
  if (!account || account.guest || !account.phoneVerified)
    return openSignIn(
      "Para registrar um problema, entre com o seu celular. Mandamos um código pelo WhatsApp.",
      "phone",
      openReport,
    );
  if (!account.nick) return openSignIn(null, "profile", openReport);
  openReport();
}

function AppLayout() {
  const match = useMatchRoute();
  const navigate = useNavigate();
  const router = useRouter();
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
  const { data: city } = useSuspenseQuery(cityQuery);
  return (
    <AppShell
      section={section}
      query={typeof search.q === "string" ? search.q : ""}
      onQuery={onQuery}
      signedIn={Boolean(account && !account.guest)}
      nick={account?.nick ?? null}
      onSignIn={() => openSignIn()}
      onReport={() => startReport(account)}
      link={(to, children, className, current) => (
        <Link key={to} to={PATH[to]} className={className} aria-current={current ? "page" : undefined}>
          {children}
        </Link>
      )}
    >
      <Outlet />
      <SignInDialog />
      <ReportDialog
        muni={canoas}
        items={city.items}
        author={
          account?.phoneVerified && account.nick ? { nick: account.nick, neighborhood: account.neighborhood } : null
        }
        onChanged={() => void router.invalidate()}
        onView={(id) => void navigate({ to: "/o/$id", params: { id } })}
      />
    </AppShell>
  );
}
