import { StageBadge, Wordmark } from "@/components/wordmark";
import { initials } from "@fala/core";
import { BarChart3, Home, Map as MapIcon, Plus, Search, User } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ShortcutHint } from "@/features/command/command-palette";
import { cn } from "@/lib/utils";

export type Section = "mapa" | "placar" | "bairro" | "voce";

export interface ShellProps {
  section: Section;
  /** Opens the ⌘K palette: the header's search is its way in for a pointer. */
  onSearch: () => void;
  onReport: () => void;
  /** Signed in with a phone; nick is null until an apelido is chosen. */
  signedIn: boolean;
  nick: string | null;
  onSignIn: () => void;
  /** Renders a navigation link; the route adapter owns routing. */
  link: (to: Section, children: ReactNode, className: string, current: boolean) => ReactNode;
  children: ReactNode;
}

const NAV: { to: Section; label: string; Icon: typeof MapIcon }[] = [
  { to: "mapa", label: "Mapa", Icon: MapIcon },
  { to: "placar", label: "Placar", Icon: BarChart3 },
  { to: "bairro", label: "Bairro", Icon: Home },
];

export function AppShell({ section, onSearch, onReport, signedIn, nick, onSignIn, link, children }: ShellProps) {
  return (
    <div className="flex h-dvh flex-col">
      <header className="relative z-30 flex h-14 items-center gap-5 border-b border-hairline bg-background pr-4 pl-5 max-phone:hidden">
        {link(
          "mapa",
          <>
            <span className="text-base font-semibold tracking-tight">
              <Wordmark />
            </span>
            <StageBadge />
          </>,
          "flex shrink-0 items-center gap-2.5 whitespace-nowrap",
          false,
        )}
        <nav aria-label="Seções" className="flex shrink-0 gap-0.5 rounded-xl border border-hairline bg-muted p-0.75">
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
        {/* Looks like the field it opens: the palette searches pins, bairros and pages, and filters the map. */}
        <button
          type="button"
          onClick={onSearch}
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          className="ml-auto flex h-8 w-full max-w-105 min-w-0 items-center gap-2 rounded-lg border border-input pr-1.5 pl-2 text-sm text-muted-foreground transition-colors outline-none hover:border-hairline-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <Search className="size-4 shrink-0" />
          <span className="truncate">Buscar registro, bairro ou código</span>
          <ShortcutHint className="ml-auto" />
        </button>
        <Button variant="signal" onClick={onReport}>
          <Plus data-icon="inline-start" />
          Registrar
        </Button>
        {signedIn ? (
          link(
            "voce",
            <span className="text-xs font-semibold" aria-label={nick ? `Você: ${nick}` : "Você"}>
              {nick ? initials(nick) : "?"}
            </span>,
            "grid size-8.5 shrink-0 place-items-center rounded-full border border-border bg-muted",
            section === "voce",
          )
        ) : (
          <Button variant="outline" onClick={onSignIn}>
            Entrar
          </Button>
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
