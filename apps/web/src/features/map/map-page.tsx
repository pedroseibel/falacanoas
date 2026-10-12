import type { Item, Municipality, Viewer } from "@fala/core";
import { useSelector } from "@tanstack/react-store";
import { Locate, Minus, Plus, Search, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PHONE_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { FilterChips, SortSelect, currentFilter, currentSort } from "./filters";
import { mapControls } from "./map-engine";
import { mapStore, setMapState, type PinMode } from "./map-store";
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
  /** Detail content (the /o/$id child route), or null. */
  detail: ReactNode;
}

const PIN_MODES: { v: PinMode; label: string }[] = [
  { v: "pontos", label: "Pontos" },
  { v: "dias", label: "+ dias" },
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
          <p className="text-xs text-muted-foreground">Pinos</p>
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
            Mapa: OpenFreeMap. Troca para CARTO com uma chave. Registros e números do protótipo são fictícios.
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

function Legend() {
  return (
    <div
      className="absolute bottom-3.5 left-3.5 z-10 flex items-center gap-3.5 rounded-xl border border-hairline bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-soft max-phone:hidden"
      aria-hidden="true"
    >
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
          className="relative z-20 flex w-100 shrink-0 flex-col border-r border-hairline bg-background"
          aria-label="Registros"
        >
          <div className="grid gap-3 border-b border-hairline px-4 pt-4.5 pb-3">
            <h1 className="text-xl font-semibold tracking-tight">O que está acontecendo em {muni.name}?</h1>
            <FilterChips muni={muni} value={filter} onChange={setFilter} />
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                <b className="font-medium text-foreground tabular-nums">{visible.length}</b> registros
              </span>
              <SortSelect value={sort} onChange={setSort} />
            </div>
          </div>
          <ListRail items={visible} muni={muni} viewer={viewer} selectedId={selectedId} onOpen={onOpen} />
        </aside>
      )}

      {!phone && selectedId && detail && (
        <section
          className="relative z-10 w-110 shrink-0 overflow-y-auto overscroll-contain border-r border-hairline bg-card"
          aria-label="Registro"
        >
          {detail}
        </section>
      )}

      <div className="relative min-w-0 flex-1 bg-ground">
        <MapView muni={muni} viewer={viewer} initial={{ visible, selectedId }} onPick={onOpen} />
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
            <span className="rounded-full border border-hairline bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-soft">
              <b className="font-medium text-foreground tabular-nums">{visible.length}</b> registros
            </span>
            <SortSelect value={sort} onChange={setSort} />
          </div>
          <SwipeRail items={visible} muni={muni} viewer={viewer} selectedId={selectedId} onOpen={onOpen} />
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
            <div className="overflow-y-auto overscroll-contain">{detail}</div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
