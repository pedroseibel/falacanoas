import {
  Link,
  Outlet,
  createFileRoute,
  useLocation,
  useMatchRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { canoas } from "@fala/instance-canoas";
import { CommandPalette } from "@/features/command/command-palette";
import { openPalette } from "@/features/command/palette-store";
import { ContentReportDialog } from "@/features/moderation/content-report-dialog";
import { OutboxRunner } from "@/features/report/outbox-runner";
import { ReportDialog } from "@/features/report/report-dialog";
import { openReport } from "@/features/report/report-store";
import { AppShell, type Section } from "@/features/shell/app-shell";
import { isModeratorQuery, MODERATION_KEY } from "@/features/moderation/queries";
import { accountQuery, authConfigQuery, memberGate } from "@/lib/account";
import { cityQuery, itemKey } from "@/lib/city";

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
  const section: Section = match({ to: "/placar" })
    ? "placar"
    : match({ to: "/bairro", fuzzy: true })
      ? "bairro"
      : match({ to: "/voce" })
        ? "voce"
        : "mapa";
  const queryClient = useQueryClient();
  const { data: account } = useSuspenseQuery(accountQuery);
  const { data: city } = useSuspenseQuery(cityQuery);
  const { data: authConfig } = useQuery(authConfigQuery);
  const member = Boolean(account?.phoneVerified && account.nick && !account.guest);
  const { data: moderator } = useQuery({ ...isModeratorQuery, enabled: member });
  const onReport = () => {
    const gate = memberGate(account);
    // A guest already chose to report without an account (round 2): straight to the form.
    if (!gate || account?.guest) return openReport();
    void navigate({ to: gate, search: { volta: here, depois: "registrar" } });
  };
  const onSignIn = () => void navigate({ to: "/entrar", search: { volta: here } });
  return (
    <AppShell
      section={section}
      onSearch={openPalette}
      signedIn={Boolean(account && !account.guest)}
      nick={account?.nick ?? null}
      onSignIn={onSignIn}
      onReport={onReport}
      link={(to, children, className, current) => (
        <Link key={to} to={PATH[to]} className={className} aria-current={current ? "page" : undefined}>
          {children}
        </Link>
      )}
    >
      <Outlet />
      <CommandPalette
        muni={canoas}
        items={city.items}
        signedIn={Boolean(account && !account.guest)}
        moderator={Boolean(moderator)}
        homeBairro={account?.neighborhood ?? null}
        onPage={(to) => void navigate({ to })}
        onBairro={(slug) => void navigate({ to: "/bairro/$slug", params: { slug } })}
        onPin={(id) => void navigate({ to: "/o/$id", params: { id } })}
        onPreloadPin={(id) => void router.preloadRoute({ to: "/o/$id", params: { id } }).catch(() => {})}
        onMapSearch={(patch) => void navigate({ to: "/mapa", search: (prev) => ({ ...prev, ...patch }) })}
        onReport={onReport}
        onSignIn={onSignIn}
      />
      <ReportDialog
        muni={canoas}
        items={city.items}
        author={
          account?.phoneVerified && account.nick
            ? { nick: account.nick, neighborhood: account.neighborhood }
            : account?.guest
              ? "guest"
              : null
        }
        turnstileSiteKey={authConfig?.turnstileSiteKey ?? null}
        onView={(id, key) => void navigate({ to: "/o/$id", params: { id }, search: key ? { chave: key } : {} })}
      />
      {/* A member's reports kept on the phone after a dropped connection go on their own (outbox.ts). */}
      {member && <OutboxRunner onView={(id) => void navigate({ to: "/o/$id", params: { id } })} />}
      <ContentReportDialog
        member={member}
        moderator={Boolean(moderator)}
        turnstileSiteKey={authConfig?.turnstileSiteKey ?? null}
        onChanged={(id) => {
          void queryClient.invalidateQueries({ queryKey: itemKey(id) });
          void queryClient.invalidateQueries({ queryKey: MODERATION_KEY });
          void queryClient.invalidateQueries({ queryKey: cityQuery.queryKey });
          void router.invalidate();
        }}
      />
    </AppShell>
  );
}
