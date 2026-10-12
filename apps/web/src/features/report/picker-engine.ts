import { isOpen, itemLngLat, type Item, type LngLat, type Municipality } from "@fala/core";
import type { Feature, FeatureCollection, Point } from "geojson";
import { cssVar, quietBasemap, styleUrl } from "@/features/map/map-engine";

type MapLibre = typeof import("maplibre-gl");

export interface PickerOptions {
  muni: Municipality;
  /** Open items, drawn as dots so a neighbour sees what is already registered nearby. */
  items: Item[];
  start: { center: LngLat; zoom: number };
  dark: boolean;
  /** Called after every move of the map (drag, zoom, keys, locate): the crosshair is the answer. */
  onMove: (at: LngLat) => void;
}

export interface Picker {
  flyTo: (at: LngLat) => void;
  dispose: () => void;
}

function openPoints(items: Item[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.flatMap((it): Feature<Point>[] => {
      const p = isOpen(it) ? itemLngLat(it) : null;
      return p ? [{ type: "Feature", geometry: { type: "Point", coordinates: p }, properties: {} }] : [];
    }),
  };
}

/** A second, small MapLibre for the report flow: the person moves the map under a fixed crosshair. */
export function mountPicker(ml: MapLibre, host: HTMLElement, opts: PickerOptions): Picker {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const map = new ml.Map({
    container: host,
    style: styleUrl(opts.dark),
    center: opts.start.center,
    zoom: opts.start.zoom,
    minZoom: 11,
    maxZoom: 19,
    maxBounds: opts.muni.bounds,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    fadeDuration: 120,
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");

  map.on("style.load", () => {
    quietBasemap(map);
    const ink = cssVar("--ink");
    map.addSource("bairros", { type: "geojson", data: opts.muni.geo.neighborhoods });
    map.addLayer({
      id: "bairro-line",
      type: "line",
      source: "bairros",
      paint: { "line-color": ink, "line-opacity": 0.3, "line-width": 1 },
    });
    map.addSource("items", { type: "geojson", data: openPoints(opts.items) });
    map.addLayer({
      id: "items",
      type: "circle",
      source: "items",
      paint: {
        "circle-color": ink,
        "circle-opacity": 0.8,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 2.5, 17, 6],
        "circle-stroke-color": cssVar("--panel"),
        "circle-stroke-width": 1.5,
      },
    });
  });
  map.on("moveend", () => {
    const c = map.getCenter();
    opts.onMove([c.lng, c.lat]);
  });

  return {
    flyTo: (at) => map.easeTo({ center: at, zoom: Math.max(map.getZoom(), 17), duration: reduce ? 0 : 600 }),
    dispose: () => map.remove(),
  };
}
