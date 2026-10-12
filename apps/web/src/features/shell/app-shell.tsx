import { BarChart3, Home, Map as MapIcon, Plus, Search, User } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export type Section = "mapa" | "placar" | "bairro" | "voce";

export interface ShellProps {
  section: Section;
  query: string;
  onQuery: (q: string) => void;
  onReport: () => void;
  /** Renders a navigation link; the route adapter owns routing. */
  link: (to: Section, children: ReactNode, className: string, current: boolean) => ReactNode;
  children: ReactNode;
}

const NAV: { to: Section; label: string; Icon: typeof MapIcon }[] = [
  { to: "mapa", label: "Mapa", Icon: MapIcon },
  { to: "placar", label: "Placar", Icon: BarChart3 },
  { to: "bairro", label: "Bairro", Icon: Home },
];

export function AppShell({ section, query, onQuery, onReport, link, children }: ShellProps) {
  return (
    <div className="flex h-dvh flex-col">
      <header className="relative z-30 flex h-14 items-center gap-5 border-b border-hairline bg-background pr-4 pl-5 max-phone:hidden">
        {link(
          "mapa",
          <>
            <span className="text-base font-semibold tracking-tight">
              Fala<span className="text-signal">,</span> Canoas
            </span>
            <Badge variant="outline">protótipo</Badge>
          </>,
          "flex items-center gap-2.5",
          false,
        )}
        <nav aria-label="Seções" className="flex gap-0.5 rounded-xl border border-hairline bg-muted p-0.75">
          {NAV.map(({ to, label, Icon }) =>
            link(
              to,
              <>
                <Icon className="size-4" />
                {label}
              </>,
              cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground",
                section === to && "bg-card text-foreground shadow-soft",
              ),
              section === to,
            ),
          )}
        </nav>
        <InputGroup className="ml-auto max-w-105">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Buscar"
            defaultValue={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar registro, bairro ou código"
          />
        </InputGroup>
        <Button variant="signal" onClick={onReport}>
          <Plus data-icon="inline-start" />
          Registrar
        </Button>
        {link(
          "voce",
          <span className="text-xs font-semibold">GS</span>,
          "grid size-8.5 place-items-center rounded-full border border-border bg-muted",
          section === "voce",
        )}
      </header>

      <main className="relative min-h-0 flex-1">{children}</main>

      <nav
        aria-label="Seções"
        className="pb-safe z-30 hidden grid-cols-5 items-center border-t border-hairline bg-background px-1.5 max-phone:grid"
      >
        {link(
          "mapa",
          <>
            <MapIcon className="size-5.5" />
            Mapa
          </>,
          tabClass(section === "mapa"),
          section === "mapa",
        )}
        {link(
          "placar",
          <>
            <BarChart3 className="size-5.5" />
            Placar
          </>,
          tabClass(section === "placar"),
          section === "placar",
        )}
        <button type="button" onClick={onReport} aria-label="Registrar" className="grid justify-items-center py-2">
          <span className="grid h-11 w-13 place-items-center rounded-2xl bg-signal text-signal-foreground shadow-soft">
            <Plus className="size-6" />
          </span>
        </button>
        {link(
          "bairro",
          <>
            <Home className="size-5.5" />
            Bairro
          </>,
          tabClass(section === "bairro"),
          section === "bairro",
        )}
        {link(
          "voce",
          <>
            <User className="size-5.5" />
            Você
          </>,
          tabClass(section === "voce"),
          section === "voce",
        )}
      </nav>
    </div>
  );
}

const tabClass = (current: boolean) =>
  cn(
    "grid justify-items-center gap-0.5 py-2 text-2xs font-medium",
    current ? "text-foreground" : "text-muted-foreground",
  );
