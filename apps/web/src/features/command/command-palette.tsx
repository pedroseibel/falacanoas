import { categoryOf, daysLabel, isOpen, isOverDeadline, type Item, type Municipality, whereOf } from "@fala/core";
import { useSelector } from "@tanstack/react-store";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  FileLock,
  FileText,
  Home,
  Lock,
  LogIn,
  Map as MapIcon,
  MapPin,
  Monitor,
  Moon,
  Plus,
  Scale,
  ShieldCheck,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon, categoryIcon, isIconName } from "@/components/Icons";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { pinIntent } from "@/lib/pin-intent";
import { queryWords } from "@/lib/search";
import { setTheme, useTheme, type Theme } from "@/lib/theme";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";
import {
  bairroLeads,
  matchCommands,
  rankBairros,
  rankPins,
  seeOnMapLabel,
  shortcutKeys,
  type CommandSpec,
} from "./palette-model";
import { closePalette, openPalette, paletteStore } from "./palette-store";

/** Pages the palette goes to; the route adapter turns them into navigation. */
type PalettePage =
  | "/mapa"
  | "/placar"
  | "/voce"
  | "/moderar"
  | "/relatorios"
  | "/transparencia"
  | "/moderacao"
  | "/privacidade"
  | "/privacidade/pedido";

export interface CommandPaletteProps {
  muni: Municipality;
  items: Item[];
  signedIn: boolean;
  moderator: boolean;
  /** The signed-in neighbour's bairro (slug), for "Seu bairro". */
  homeBairro: string | null;
  onPage: (to: PalettePage) => void;
  onBairro: (slug: string) => void;
  onPin: (id: string) => void;
  /** Starts loading a pin the highlight rests on, so Enter opens it at once. */
  onPreloadPin: (id: string) => void;
  /** The map's list, filtered: by what was typed (q) or by a group of types (f). */
  onMapSearch: (patch: { q?: string; f?: string }) => void;
  onReport: () => void;
  onSignIn: () => void;
}

interface PaletteCommand extends CommandSpec {
  id: string;
  icon: ReactNode;
  run: () => void;
  checked?: boolean;
  hint?: string;
}

const PINS = 6;
const BAIRROS = 4;

const THEMES: { t: Theme; label: string; I: LucideIcon }[] = [
  { t: "light", label: "Tema claro", I: Sun },
  { t: "dark", label: "Tema escuro", I: Moon },
  { t: "auto", label: "Tema automático", I: Monitor },
];

const lucide = (I: LucideIcon) => <I />;

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/**
 * ⌘K (Ctrl K elsewhere), or "/" outside a field: one box to find a pin by its code, title, type or
 * place, go to a bairro or a page, and act (register, sign in, filter the map, change the theme).
 * Not inside another dialog: ⌘K while writing a report doesn't throw the form behind a palette.
 */
export function CommandPalette(props: CommandPaletteProps) {
  const { open, session } = useSelector(paletteStore, (s) => s);
  // What a chosen command opens after the palette has closed, so the two dialogs don't fight over focus.
  const after = useRef<(() => void) | null>(null);
  useMountEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.defaultPrevented) return;
      // Another dialog: not the palette itself, which keeps focus for a moment while it closes.
      const inDialog =
        e.target instanceof Element && e.target.closest('[role="dialog"]') !== null && !e.target.closest("[cmdk-root]");
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        if (paletteStore.state.open) {
          e.preventDefault();
          closePalette();
        } else if (!inDialog) {
          e.preventDefault();
          openPalette();
        }
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !inDialog && !editable(e.target)) {
        e.preventDefault();
        openPalette();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => (o ? openPalette() : closePalette())}
      onOpenChangeComplete={(o) => {
        if (o) return;
        after.current?.();
        after.current = null;
      }}
      title="Buscar e ir para"
      description="Busque um registro pelo código, pelo título ou pelo lugar, um bairro ou uma página."
      className="top-28 sm:max-w-xl"
    >
      <PaletteBody
        key={session}
        {...props}
        onDone={(run, later = false) => {
          if (later) after.current = run;
          closePalette();
          if (!later) run();
        }}
      />
    </CommandDialog>
  );
}

function PaletteBody({
  muni,
  items,
  signedIn,
  moderator,
  homeBairro,
  onPage,
  onBairro,
  onPin,
  onPreloadPin,
  onMapSearch,
  onReport,
  onSignIn,
  onDone,
}: CommandPaletteProps & { onDone: (run: () => void, later?: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [intent] = useState(() => pinIntent(onPreloadPin));
  const theme = useTheme();
  const words = queryWords(query);
  const pins = rankPins(items, words, muni, PINS);
  const bairros = rankBairros(muni, items, words, BAIRROS);
  const home = muni.neighborhoods.find((n) => n.slug === homeBairro);
  const page = (to: PalettePage) => () => onDone(() => onPage(to));

  const actions: PaletteCommand[] = [
    {
      id: "registrar",
      label: "Registrar um problema",
      keywords: ["novo", "foto", "reclamar", "avisar", "adicionar"],
      icon: lucide(Plus),
      run: () => onDone(onReport, true),
    },
    ...(signedIn
      ? []
      : [
          {
            id: "entrar",
            label: "Entrar",
            keywords: ["login", "conta", "celular", "telefone", "acessar"],
            icon: lucide(LogIn),
            run: () => onDone(onSignIn),
          },
        ]),
  ];
  const pages: PaletteCommand[] = [
    {
      id: "mapa",
      label: "Mapa",
      keywords: ["registros", "início", "lista"],
      icon: lucide(MapIcon),
      run: page("/mapa"),
    },
    {
      id: "placar",
      label: "Placar",
      keywords: ["órgãos", "secretarias", "prazo", "prefeitura", "ranking"],
      icon: lucide(BarChart3),
      run: page("/placar"),
    },
    ...(home
      ? [
          {
            id: "seu-bairro",
            label: "Seu bairro",
            hint: home.name,
            keywords: [home.name, "bairro", "vizinhos"],
            icon: lucide(Home),
            run: () => onDone(() => onBairro(home.slug)),
          },
        ]
      : []),
    ...(signedIn
      ? [
          {
            id: "voce",
            label: "Você",
            keywords: ["conta", "perfil", "seguindo", "apelido", "notificações", "meus registros"],
            icon: lucide(User),
            run: page("/voce"),
          },
        ]
      : []),
    ...(moderator
      ? [
          {
            id: "moderar",
            label: "Moderar",
            keywords: ["fila", "fotos", "denúncias", "moderação"],
            icon: lucide(ShieldCheck),
            run: page("/moderar"),
          },
        ]
      : []),
    {
      id: "relatorios",
      label: "Relatórios mensais",
      keywords: ["pdf", "mês", "órgãos", "relatório", "secretarias"],
      icon: lucide(FileText),
      run: page("/relatorios"),
    },
    {
      id: "transparencia",
      label: "Transparência",
      keywords: ["números", "remoções", "moderação", "relatório"],
      icon: lucide(Scale),
      run: page("/transparencia"),
    },
    {
      id: "moderacao",
      label: "Como funciona a moderação",
      keywords: ["guia", "moderador", "voluntário", "regras", "moderar"],
      typedOnly: true,
      icon: lucide(BookOpen),
      run: page("/moderacao"),
    },
    {
      id: "privacidade",
      label: "Privacidade",
      keywords: ["dados", "lgpd", "aviso", "cookies"],
      typedOnly: true,
      icon: lucide(Lock),
      run: page("/privacidade"),
    },
    {
      id: "pedido",
      label: "Pedir meus dados ou apagá-los",
      keywords: ["lgpd", "dados", "apagar", "exportar", "titular", "pedido"],
      typedOnly: true,
      icon: lucide(FileLock),
      run: page("/privacidade/pedido"),
    },
  ];
  const filters: PaletteCommand[] = muni.filterGroups.map((g) => ({
    id: `filtro-${g.key}`,
    label: g.key === "tudo" ? "Mostrar tudo no mapa" : `Mostrar no mapa: ${g.label}`,
    keywords: [
      "filtrar",
      "filtro",
      ...(g.key === "agora" ? ["recentes", "últimas horas", "hoje"] : []),
      ...muni.categories.filter((c) => c.group === g.key).map((c) => c.label),
    ],
    typedOnly: true,
    icon: g.icon && isIconName(g.icon) ? <Icon name={g.icon} size={16} /> : lucide(MapIcon),
    run: () => onDone(() => onMapSearch({ f: g.key === "tudo" ? undefined : g.key })),
  }));
  const themes: PaletteCommand[] = THEMES.map(({ t, label, I }) => ({
    id: `tema-${t}`,
    label,
    keywords: ["tema", "aparência", "modo", "cor", t === "dark" ? "noite" : t === "light" ? "dia" : "sistema"],
    typedOnly: true,
    checked: theme === t,
    icon: lucide(I),
    run: () => onDone(() => setTheme(t)),
  }));

  const pinGroup = pins.total > 0 && (
    <CommandGroup heading="Registros">
      {pins.shown.map((it) => (
        <PinRow key={it.id} it={it} muni={muni} onSelect={() => onDone(() => onPin(it.id))} />
      ))}
      {pins.total > 1 && (
        <CommandItem
          value="ver-no-mapa"
          onSelect={() => onDone(() => onMapSearch({ q: query.trim().slice(0, 80), f: undefined }))}
        >
          <span className="grid size-8 shrink-0 place-items-center text-muted-foreground">
            <ArrowRight />
          </span>
          <span className="truncate">{seeOnMapLabel(pins.total, query.trim())}</span>
        </CommandItem>
      )}
    </CommandGroup>
  );
  const bairroGroup = bairros.length > 0 && (
    <CommandGroup heading="Bairros">
      {bairros.map((b) => (
        <CommandItem key={b.slug} value={`bairro:${b.slug}`} onSelect={() => onDone(() => onBairro(b.slug))}>
          <MapPin />
          <span className="truncate">{b.name}</span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
            {b.open === 0 ? "nenhum aberto" : b.open === 1 ? "1 aberto" : `${b.open} abertos`}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
  const leads = bairroLeads(bairros, words);

  return (
    <Command
      shouldFilter={false}
      loop
      // cmdk reads Ctrl K as "up" (vim keys): it would swallow the shortcut that closes the palette.
      vimBindings={false}
      label="Buscar e ir para"
      onValueChange={(v) => {
        if (v.startsWith("pin:")) intent.rest(v.slice(4).toUpperCase());
        else intent.leave();
      }}
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder="Buscar registro, bairro ou código" />
      <CommandList className="max-h-96">
        <CommandEmpty>
          <p className="font-medium">Nada encontrado para “{query.trim()}”.</p>
        </CommandEmpty>
        {leads && bairroGroup}
        {pinGroup}
        {!leads && bairroGroup}
        <Commands heading="Ações" commands={matchCommands(actions, words)} />
        <Commands heading="Ir para" commands={matchCommands(pages, words)} />
        <Commands heading="Mapa" commands={matchCommands(filters, words)} />
        <Commands heading="Aparência" commands={matchCommands(themes, words)} />
      </CommandList>
      <footer className="flex items-center gap-4 border-t border-hairline px-3 pt-2 pb-1.5 text-xs text-muted-foreground pointer-coarse:hidden">
        <span className="inline-flex items-center gap-1.5">
          <KbdGroup>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </KbdGroup>
          escolher
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          abrir
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>esc</Kbd>
          fechar
        </span>
      </footer>
    </Command>
  );
}

function Commands({ heading, commands }: { heading: string; commands: PaletteCommand[] }) {
  if (!commands.length) return null;
  return (
    <CommandGroup heading={heading}>
      {commands.map((c) => (
        <CommandItem key={c.id} value={c.id} onSelect={c.run} checked={c.checked}>
          {c.icon}
          <span className="truncate">{c.label}</span>
          {c.hint && <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">{c.hint}</span>}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

function PinRow({ it, muni, onSelect }: { it: Item; muni: Municipality; onSelect: () => void }) {
  const open = isOpen(it);
  const late = isOverDeadline(it, muni.deadlineDays);
  return (
    <CommandItem value={`pin:${it.id}`} onSelect={onSelect}>
      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-hairline bg-panel-3 text-muted-foreground">
        <Icon name={categoryIcon(it.category)} size={16} />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate font-medium">{it.title}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">
            {categoryOf(muni, it.category).label} ·{" "}
            {whereOf(it, muni)}
          </span>
          {it.demo && <Badge variant="chip-inline">exemplo</Badge>}
        </span>
      </span>
      <span className="grid shrink-0 justify-items-end gap-0.5 text-xs text-muted-foreground">
        <span className="font-mono tracking-wide">{it.id}</span>
        {open ? (
          <span className={cn("tabular-nums", late && "text-signal-text")}>
            {it.days} {daysLabel(it.days)}
            {late && <span className="sr-only">, acima do prazo de referência</span>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <Check className="size-3" />
            resolvido
          </span>
        )}
      </span>
    </CommandItem>
  );
}

const noSubscribe = () => () => undefined;

/** The palette's shortcut as this keyboard prints it; nothing until hydrated (the server can't know). */
export function ShortcutHint({ className }: { className?: string }) {
  const ua = useSyncExternalStore(
    noSubscribe,
    () => navigator.userAgent,
    () => null,
  );
  if (!ua) return null;
  return (
    // Decorative: the trigger names the shortcut with aria-keyshortcuts.
    <KbdGroup className={className} aria-hidden="true">
      {shortcutKeys(ua).map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </KbdGroup>
  );
}
