import {
  Link,
  Outlet,
  createFileRoute,
  useLocation,
  useMatchRoute,
  useNavigate,
  useRouter,
  useSearch,
} from "@tanstack/react-router";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { ReportDialog } from "@/features/report/report-dialog";
import { openReport } from "@/features/report/report-store";
import { AppShell, type Section } from "@/features/shell/app-shell";
import { accountQuery, cityQuery, memberGate } from "@/lib/city";

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

/** Registrar needs a verified phone and an apelido: /entrar or /bem-vindo first, then straight into the form. */
function AppLayout() {
  const match = useMatchRoute();
  const navigate = useNavigate();
  const router = useRouter();
  const here = useLocation({ select: (l) => l.href });
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
      onSignIn={() => void navigate({ to: "/entrar", search: { volta: here } })}
      onReport={() => {
        const gate = memberGate(account);
        if (!gate) return openReport();
        void navigate({ to: gate, search: { volta: here, depois: "registrar" } });
      }}
      link={(to, children, className, current) => (
        <Link key={to} to={PATH[to]} className={className} aria-current={current ? "page" : undefined}>
          {children}
        </Link>
      )}
    >
      <Outlet />
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
