import type { Item } from "@fala/core";
import { createStore } from "@tanstack/react-store";

export type PinMode = "pontos" | "dias" | "bairros";

export interface MapState {
  /** What the rail shows, in order; the map draws the same set. */
  visible: Item[];
  /** Opened in the detail (from the URL). */
  selectedId: string | null;
  /** Highlighted without opening (phone rail swipe). */
  focusId: string | null;
  hoveredId: string | null;
  pinMode: PinMode;
  dark: boolean;
}

/**
 * Client state shared between React and the imperative map. Written by route lifecycle hooks
 * (URL → state) and event handlers; read by components with useSelector and by MapLibre via
 * subscribe(). Never written during render.
 */
export const mapStore = createStore<MapState>({
  visible: [],
  selectedId: null,
  focusId: null,
  hoveredId: null,
  pinMode: "pontos",
  dark: false,
});

export const setMapState = (patch: Partial<MapState>) => {
  if (typeof window === "undefined") return;
  mapStore.setState((prev) => ({ ...prev, ...patch }));
};
