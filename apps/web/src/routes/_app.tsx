import { Link, Outlet, createFileRoute, useMatchRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { toast } from "sonner";
import { AppShell, type Section } from "@/features/shell/app-shell";
import { cityQuery } from "@/lib/city";

export const Route = createFileRoute("/_app")({
  loader: ({ context }) => context.queryClient.ensureQueryData(cityQuery),
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
  return (
    <AppShell
      section={section}
      query={typeof search.q === "string" ? search.q : ""}
      onQuery={onQuery}
      onReport={() => toast("O fluxo de registro é o próximo passo desta versão.")}
      link={(to, children, className, current) => (
        <Link key={to} to={PATH[to]} className={className} aria-current={current ? "page" : undefined}>
          {children}
        </Link>
      )}
    >
      <Outlet />
    </AppShell>
  );
}
