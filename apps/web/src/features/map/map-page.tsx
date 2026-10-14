import { plural, type Item, type Municipality, type Viewer } from "@fala/core";
import { useSelector } from "@tanstack/react-store";
import { Locate, Minus, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { FilterChips, SortSelect, currentFilter, currentSort } from "./filters";
import { mapControls } from "./map-engine";
import { mapStore, setMapState, type PinMode } from "./map-store";
import type { PinIntent } from "./pin-intent";
import { MapView } from "./map-view";
import { ListRail, SwipeRail } from "./rail";
import type { MapSearch, Sort } from "./selectors";

export interface MapPageProps {
  muni: Municipality;
  viewer: Viewer;
  visible: Item[];
  search: MapSearch;
  selectedId: string | null;
  onSearch: (patch: Partial<MapSearch>) => void;
  onOpen: (id: string) => void;
  onClose: () => void;
  /** Starts loading a pin the pointer rests on or presses, in the list, the rail or the map. */
  intent?: PinIntent;
  /** Detail content (the /o/$id child route), or null. */
  detail: ReactNode;
}

/** The detail's way back to the whole map: pinned to the panel's corner while it scrolls. */
function CloseDetail({ onClose }: { onClose: () => void }) {
  return (
    <div className="sticky top-0 z-20 h-0">
      <span className="absolute top-3 right-3">
        <Button variant="floating" size="icon-lg" aria-label="Fechar e voltar ao mapa" onClick={onClose}>
          <X />
        </Button>
      </span>
    </div>
  );
}

const PIN_MODES: { v: PinMode; label: string }[] = [
  { v: "pontos", label: "Pontos" },
  { v: "dias", label: "Com dias" },
  { v: "bairros", label: "Por bairro" },
];

function MapSettings() {
  const pinMode = useSelector(mapStore, (s) => s.pinMode);
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="floating" size="sm" />}>
        <SlidersHorizontal data-icon="inline-start" />
        Exibição
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="grid gap-2">
          <p className="text-xs text-muted-foreground">Registros no mapa</p>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[pinMode]}
            onValueChange={(v) => {
              const m = PIN_MODES.find((p) => p.v === v[0]);
              if (m) setMapState({ pinMode: m.v });
            }}
          >
            {PIN_MODES.map((p) => (
              <ToggleGroupItem key={p.v} value={p.v}>
                {p.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            Mapa: OpenFreeMap. Registros marcados como exemplo são fictícios.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MapControls() {
  return (
    <div className="absolute top-3.5 right-3.5 z-10 grid gap-2 max-phone:top-32">
      <div className="grid overflow-hidden rounded-xl border border-hairline bg-card shadow-soft">
        <Button variant="ghost" size="icon" aria-label="Aproximar" onClick={() => mapControls.current?.zoomBy(1)}>
          <Plus />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Afastar" onClick={() => mapControls.current?.zoomBy(-1)}>
          <Minus />
        </Button>
      </div>
      <Button
        variant="floating"
        size="icon"
        aria-label="Minha localização"
        onClick={() => mapControls.current?.locate()}
      >
        <Locate />
      </Button>
    </div>
  );
}

/** The bairro shading's steps, as map-engine paints them: none, then 6% to 50% ink. */
const BAIRRO_STEPS = [
  "border border-hairline-strong",
  "bg-foreground/6",
  "bg-foreground/20",
  "bg-foreground/35",
  "bg-foreground/50",
];

function Legend() {
  const pinMode = useSelector(mapStore, (s) => s.pinMode);
  return (
    <div
      // Under 56rem of map the credit line (bottom right) reaches it, so it sits above that line; under
      // 28rem (list and pin both open) there is no room for it.
      className="absolute bottom-3.5 left-3.5 z-10 flex items-center gap-3.5 rounded-xl border border-hairline bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-soft max-phone:hidden @max-4xl:bottom-9 @max-md:hidden"
      aria-hidden="true"
    >
      {pinMode === "bairros" ? <BairroKey /> : <PinKey />}
    </div>
  );
}

function BairroKey() {
  return (
    <>
      Registros abertos por bairro
      <span className="inline-flex items-center gap-1.5">
        nenhum
        <span className="inline-flex gap-0.5">
          {BAIRRO_STEPS.map((c) => (
            <i key={c} className={cn("h-2.5 w-4 rounded-xs", c)} />
          ))}
        </span>
        mais
      </span>
    </>
  );
}

function PinKey() {
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2 rounded-full bg-foreground" />
        aberto
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-3 rounded-full bg-foreground" />
        aberto há mais tempo
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2 rounded-full border-2 border-muted-foreground bg-card" />
        resolvido
      </span>
    </>
  );
}

/**
 * The list when nothing matches: says why, and the way out. The search box clears itself; a filter
 * chip gets a button back to everything.
 */
function NothingHere({ search, onShowAll }: { search: MapSearch; onShowAll: () => void }) {
  const filtered = currentFilter(search) !== "tudo";
  return (
    <div className="grid justify-items-start gap-2 px-4 py-5 text-sm" role="status">
      <p className="font-medium text-pretty">
        {search.q
          ? `Nenhum registro para “${search.q}”${filtered ? " com este filtro" : ""}.`
          : filtered
            ? "Nenhum registro com este filtro."
            : "Ainda não há registros aqui."}
      </p>
      {search.q && <p className="text-muted-foreground">Busque pelo título, pelo bairro ou pelo código.</p>}
      {filtered && (
        <Button variant="outline" size="sm" onClick={onShowAll}>
          Ver todos
        </Button>
      )}
    </div>
  );
}

export function MapPage({
  muni,
  viewer,
  visible,
  search,
  selectedId,
  onSearch,
  onOpen,
  onClose,
  intent,
  detail,
}: MapPageProps) {
  const phone = useMediaQuery(PHONE_QUERY);
  const filter = currentFilter(search);
  const sort = currentSort(search);
  const setFilter = (f: string) => onSearch({ f: f === "tudo" ? undefined : f });
  const setSort = (s: Sort) => onSearch({ sort: s === "perto" ? undefined : s });

  return (
    <div className="relative flex h-full min-h-0">
      {!phone && (
        <aside
          // Hidden, not unmounted, so the list keeps its scroll: below 75rem an open pin takes its place,
          // or list + panel would leave the map a sliver. Phones get the rail (CSS too, so the server's
          // first paint is already right).
          className={cn(
            "relative z-20 flex w-100 shrink-0 flex-col border-r border-hairline bg-background max-phone:hidden",
            selectedId && detail && "max-wide:hidden",
          )}
          aria-label="Registros"
        >
          <div className="grid gap-3 border-b border-hairline px-4 pt-4.5 pb-3">
            <h1 className="text-xl leading-snug font-semibold tracking-tight text-balance">
              O que está acontecendo em {muni.name}?
            </h1>
            <FilterChips muni={muni} value={filter} onChange={setFilter} />
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="flex min-w-0 items-center gap-2">
                <span role="status" className="shrink-0">
                  <b className="font-medium text-foreground tabular-nums">{visible.length}</b>{" "}
                  {plural(visible.length, "registro", "registros")}
                  {search.q && <span className="sr-only"> com “{search.q}”</span>}
                </span>
                {/* What the palette's "ver no mapa" filtered by, and the way back to everything. */}
                {search.q && (
                  <Button
                    variant="outline"
                    size="chip"
                    className="min-w-0"
                    aria-label={`Limpar a busca “${search.q}”`}
                    onClick={() => onSearch({ q: undefined })}
                  >
                    <span className="truncate">“{search.q}”</span>
                    <X data-icon="inline-end" />
                  </Button>
                )}
              </span>
              <SortSelect value={sort} onChange={setSort} />
            </div>
          </div>
          {visible.length ? (
            <ListRail
              items={visible}
              muni={muni}
              viewer={viewer}
              selectedId={selectedId}
              onOpen={onOpen}
              intent={intent}
            />
          ) : (
            <NothingHere search={search} onShowAll={() => setFilter("tudo")} />
          )}
        </aside>
      )}

      {!phone && selectedId && detail && (
        <section
          // Out of the list's edge when a pin opens from the whole map; switching pins keeps it mounted,
          // so it doesn't replay, and closing is instant.
          className="relative z-10 w-110 shrink-0 overflow-y-auto overscroll-contain border-r border-hairline bg-card transition duration-220 ease-fluid starting:-translate-x-3 starting:opacity-0 max-phone:hidden motion-reduce:starting:translate-x-0"
          aria-label="Registro"
          onKeyDown={(e) => {
            // Esc in the update or reply field must not close the panel and drop what was typed.
            const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
            if (e.key === "Escape" && !e.defaultPrevented && !typing) onClose();
          }}
        >
          <CloseDetail onClose={onClose} />
          {detail}
        </section>
      )}

      {/* A size container: the legend makes room for the map credit by the map's width, not the window's. */}
      <div className="@container relative min-w-0 flex-1 bg-ground">
        <MapView muni={muni} viewer={viewer} initial={{ visible, selectedId }} onPick={onOpen} intent={intent} />
        {phone ? (
          <div className="pt-safe absolute inset-x-0 top-0 z-10 grid gap-2 px-3">
            <InputGroup variant="floating">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                aria-label="Buscar"
                defaultValue={search.q ?? ""}
                onChange={(e) => onSearch({ q: e.target.value || undefined })}
                placeholder={`O que está acontecendo em ${muni.name}?`}
              />
              <InputGroupAddon align="inline-end">
                <Badge variant="outline">protótipo</Badge>
              </InputGroupAddon>
            </InputGroup>
            <FilterChips muni={muni} value={filter} onChange={setFilter} />
          </div>
        ) : (
          <div className="absolute top-3.5 left-3.5 z-10">
            <MapSettings />
          </div>
        )}
        <MapControls />
        <Legend />
      </div>

      {phone && (
        <div className="absolute inset-x-0 bottom-0 z-20">
          <div className="flex items-center justify-between px-3.5 pb-2">
            <span
              role="status"
              className="rounded-full border border-hairline bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-soft"
            >
              <b className="font-medium text-foreground tabular-nums">{visible.length}</b>{" "}
              {plural(visible.length, "registro", "registros")}
            </span>
            <SortSelect value={sort} onChange={setSort} floating />
          </div>
          {visible.length ? (
            <SwipeRail
              items={visible}
              muni={muni}
              viewer={viewer}
              selectedId={selectedId}
              onOpen={onOpen}
              intent={intent}
            />
          ) : (
            <div className="px-3.5 pb-3">
              <div className="rounded-xl border border-hairline bg-card shadow-float">
                <NothingHere search={search} onShowAll={() => setFilter("tudo")} />
              </div>
            </div>
          )}
        </div>
      )}

      {phone && (
        <Drawer
          open={Boolean(selectedId && detail)}
          onOpenChange={(o) => {
            if (!o) onClose();
          }}
          showSwipeHandle
        >
          <DrawerContent>
            <DrawerTitle className="sr-only">Registro</DrawerTitle>
            <div className="overflow-y-auto overscroll-contain">
              <CloseDetail onClose={onClose} />
              {detail}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
