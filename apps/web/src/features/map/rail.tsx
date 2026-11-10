import { distance, type Item, type Municipality, type Viewer } from "@fala/core";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { Button } from "@/components/ui/button";
import { ItemCard } from "@/components/item-card";
import { mapStore, setMapState } from "./map-store";
import type { PinIntent } from "@/lib/pin-intent";
import { distanceTo } from "./selectors";

interface RailProps {
  items: Item[];
  muni: Municipality;
  viewer: Viewer;
  selectedId: string | null;
  onOpen: (id: string) => void;
  intent?: PinIntent;
}

const hover = (id: string | null) => setMapState({ hoveredId: id });

/** Desktop: virtualized vertical list (handles 400+ records without DOM bloat). */
export function ListRail({ items, muni, viewer, selectedId, onOpen, intent }: RailProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 112,
    overscan: 6,
  });
  // Keep the selected card in view: on mount (deep link) and whenever the selection changes (map click).
  useMountEffect(() => {
    const reveal = (id: string | null, align: "center" | "auto") => {
      const idx = id ? mapStore.state.visible.findIndex((i) => i.id === id) : -1;
      if (idx >= 0) v.scrollToIndex(idx, { align });
    };
    reveal(selectedId, "center");
    let last = mapStore.state.selectedId;
    const sub = mapStore.subscribe((s) => {
      if (s.selectedId !== last) reveal(s.selectedId, "auto");
      last = s.selectedId;
    });
    return () => sub.unsubscribe();
  });
  return (
    <div
      ref={scroller}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pt-2 pb-6"
      aria-label="Registros"
    >
      <div className="relative w-full" style={{ height: v.getTotalSize() }}>
        {v.getVirtualItems().map((row) => {
          const it = items[row.index];
          if (!it) return null;
          return (
            <div
              key={it.id}
              ref={v.measureElement}
              data-index={row.index}
              className="absolute top-0 left-0 w-full pb-0.5"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <ItemCard
                it={it}
                muni={muni}
                selected={it.id === selectedId}
                distance={distance(distanceTo(viewer.location, it, muni))}
                onOpen={onOpen}
                onHover={hover}
                intent={intent}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PAGE = 40;

/** Phone: horizontal snap rail over the map. Swiping focuses a pin without opening it. */
export function SwipeRail({ items, muni, viewer, selectedId, onOpen, intent }: RailProps) {
  const [limit, setLimit] = useState(PAGE);
  const rail = useRef<HTMLDivElement>(null);
  const focusNearest = useDebouncedCallback(
    () => {
      const el = rail.current;
      if (!el) return;
      const left = el.getBoundingClientRect().left;
      let best: { id: string; d: number } | null = null;
      for (const card of el.querySelectorAll<HTMLElement>("[data-id]")) {
        const d = Math.abs(card.getBoundingClientRect().left - left - 14);
        const id = card.dataset.id;
        if (id && (!best || d < best.d)) best = { id, d };
      }
      if (!best) return;
      setMapState({ focusId: best.id });
      // The card a swipe settles on is the likeliest next tap.
      intent?.rest(best.id);
    },
    { wait: 140 },
  );
  return (
    <div
      ref={rail}
      onScroll={focusNearest}
      data-rail
      className="flex snap-x snap-mandatory scroll-px-3.5 gap-2.5 overflow-x-auto overscroll-x-contain px-3.5 scrollbar-none pt-0.5 pb-3"
    >
      {items.slice(0, limit).map((it) => (
        <ItemCard
          key={it.id}
          it={it}
          muni={muni}
          layout="rail"
          selected={it.id === selectedId}
          distance={distance(distanceTo(viewer.location, it, muni))}
          onOpen={onOpen}
          intent={intent}
        />
      ))}
      {items.length > limit && (
        <Button variant="outline" className="shrink-0 self-center" onClick={() => setLimit((l) => l + PAGE)}>
          Mostrar mais
        </Button>
      )}
    </div>
  );
}
