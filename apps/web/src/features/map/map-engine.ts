import { itemLngLat, isOpen, mmLabel, type GaugeNow, type Item, type Municipality, type Viewer } from "@fala/core";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  MapLayerMouseEvent,
  MapLayerTouchEvent,
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";
import { mapStore, type MapState } from "./map-store";
import type { PinIntent } from "./pin-intent";

type MapLibre = typeof import("maplibre-gl");

/** OpenFreeMap until a CARTO key exists (research/DECISIONS.md, round 14). */
const STYLE_URL = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
// CARTO: `https://basemaps.cartocdn.com/gl/${dark ? "dark-matter" : "positron"}-nolabels-gl-style/style.json?key=${KEY}`
export const styleUrl = (dark: boolean) => STYLE_URL[dark ? "dark" : "light"];

export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** The saved theme, or the system's. */
export function prefersDark(): boolean {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Paints the basemap's background with our ground and hides points of interest, transit and house numbers. */
export function quietBasemap(map: MapLibreMap) {
  for (const l of map.getStyle().layers) {
    if (l.type === "background") map.setPaintProperty(l.id, "background-color", cssVar("--ground"));
    if (/poi|housenumber|aeroway|transit/i.test(l.id)) map.setLayoutProperty(l.id, "visibility", "none");
  }
}

function featureCollection(items: Item[]) {
  return {
    type: "FeatureCollection" as const,
    features: items.flatMap((it) => {
      const p = itemLngLat(it);
      return p
        ? [
            {
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: p },
              properties: { id: it.id, days: it.days, open: isOpen(it) ? 1 : 0, q: it.kind === "public_issue" ? 1 : 0 },
            },
          ]
        : [];
    }),
  };
}

export interface MapEngineOptions {
  muni: Municipality;
  viewer: Viewer;
  onPick: (id: string) => void;
  intent?: PinIntent;
  isPhone: () => boolean;
  railHeight: () => number;
}

/** Mounts MapLibre in `host`, keeps it in sync with mapStore, and returns a disposer. */
export function mountMap(ml: MapLibre, host: HTMLElement, opts: MapEngineOptions): () => void {
  const { muni, viewer } = opts;
  let state = mapStore.state;
  let ready = false;
  const map: MapLibreMap = new ml.Map({
    container: host,
    style: styleUrl(state.dark),
    center: muni.center,
    zoom: opts.isPhone() ? 11.4 : 12.1,
    minZoom: 10.4,
    maxZoom: 18,
    maxBounds: muni.bounds,
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    fadeDuration: 120,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(
    new ml.AttributionControl({ compact: true, customAttribution: "Dados fictícios do protótipo" }),
    "bottom-right",
  );

  const me = document.createElement("div");
  me.className = "fc-mepin";
  me.title = "Você (aproximado)";
  new ml.Marker({ element: me }).setLngLat(viewer.location).addTo(map);

  let selMarker: Marker | null = null;
  let hovMarker: Marker | null = null;
  let gaugeMarkers: Marker[] = [];

  const itemsSource = (): GeoJSONSource | null => {
    const s = map.getSource("items");
    return s instanceof ml.GeoJSONSource ? s : null;
  };

  function addLayers() {
    const ink = cssVar("--ink");
    const paper = cssVar("--panel");
    const ink3 = cssVar("--ink-3");
    const signal = cssVar("--signal");
    quietBasemap(map);
    const hasGlyphs = Boolean(map.getStyle().glyphs);
    map.addSource("bairros", { type: "geojson", data: muni.geo.neighborhoods, promoteId: "slug" });
    map.addSource("limite", { type: "geojson", data: muni.geo.boundary });
    map.addSource("items", {
      type: "geojson",
      data: featureCollection(state.visible),
      cluster: true,
      clusterMaxZoom: 13.4,
      clusterRadius: 48,
    });
    const sel: ExpressionSpecification = ["boolean", ["feature-state", "sel"], false];
    map.addLayer({
      id: "bairro-fill",
      type: "fill",
      source: "bairros",
      paint: {
        "fill-color": ["case", sel, signal, ink],
        "fill-opacity": ["case", sel, 0.1, ["*", ["coalesce", ["feature-state", "v"], 0], 0.5]],
      },
    });
    map.addLayer({
      id: "bairro-line",
      type: "line",
      source: "bairros",
      paint: {
        "line-color": ["case", sel, signal, ink],
        "line-opacity": ["case", sel, 1, 0.26],
        // MapLibre allows "zoom" only at the top of an interpolate, so the selection case goes inside it.
        "line-width": ["interpolate", ["linear"], ["zoom"], 11, ["case", sel, 2, 0.8], 15, ["case", sel, 2, 1.4]],
      },
    });
    map.addLayer({
      id: "limite-line",
      type: "line",
      source: "limite",
      paint: { "line-color": ink, "line-opacity": 0.55, "line-width": 1.4 },
    });
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "items",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": ink,
        "circle-opacity": 0.94,
        "circle-stroke-color": paper,
        "circle-stroke-width": 2.5,
        "circle-radius": ["step", ["get", "point_count"], 13, 8, 16, 25, 20, 60, 24],
      },
    });
    if (hasGlyphs)
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "items",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: { "text-color": paper },
      });
    const open: ExpressionSpecification = ["==", ["get", "open"], 1];
    map.addLayer({
      id: "points",
      type: "circle",
      source: "items",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "q"], 0]],
      paint: {
        "circle-color": ["case", open, ink, paper],
        "circle-stroke-color": ["case", open, paper, ink3],
        "circle-stroke-width": ["case", open, 2, 1.6],
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          11,
          ["case", open, ["interpolate", ["linear"], ["get", "days"], 0, 3.2, 30, 4.4, 120, 6], 3],
          16,
          ["case", open, ["interpolate", ["linear"], ["get", "days"], 0, 6, 30, 8.5, 120, 12], 5.5],
        ],
      },
    });
    map.addLayer({
      id: "questions",
      type: "circle",
      source: "items",
      filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "q"], 1]],
      paint: {
        "circle-color": paper,
        "circle-stroke-color": ink,
        "circle-stroke-width": 3,
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 5, 16, 9],
      },
    });
    if (hasGlyphs)
      map.addLayer({
        id: "days",
        type: "symbol",
        source: "items",
        minzoom: 13.6,
        filter: ["all", ["!", ["has", "point_count"]], open],
        layout: {
          "text-field": ["concat", ["to-string", ["get", "days"]], "d"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
          "text-offset": [0, -1.45],
          "text-anchor": "bottom",
          visibility: "none",
        },
        paint: { "text-color": ink, "text-halo-color": paper, "text-halo-width": 1.6 },
      });
    ready = true;
    applyPins(state);
    applySelection(state, Boolean(state.selectedId));
  }

  function applyPins(s: MapState) {
    if (!ready) return;
    const byBairro = s.pinMode === "bairros";
    for (const l of ["clusters", "cluster-count", "points", "questions"])
      if (map.getLayer(l)) map.setLayoutProperty(l, "visibility", byBairro ? "none" : "visible");
    if (map.getLayer("days")) map.setLayoutProperty("days", "visibility", s.pinMode === "dias" ? "visible" : "none");
    const counts = new Map<string, number>();
    if (byBairro)
      for (const it of s.visible)
        if (isOpen(it) && it.neighborhood) counts.set(it.neighborhood, (counts.get(it.neighborhood) ?? 0) + 1);
    const max = Math.max(1, ...counts.values());
    // One open record must read differently from none, however busy the busiest bairro is: a floor of
    // 12% of the ramp (fill 6%), then proportional up to the maximum (50%). The legend draws the same.
    const shade = (n: number) => (n ? 0.12 + (0.88 * n) / max : 0);
    for (const n of muni.neighborhoods)
      map.setFeatureState({ source: "bairros", id: n.slug }, { v: byBairro ? shade(counts.get(n.slug) ?? 0) : 0 });
  }

  function marker(className: string, html: string, lngLat: [number, number], anchor: "left" | "center") {
    const el = document.createElement("div");
    el.className = className;
    el.innerHTML = html;
    return new ml.Marker({ element: el, anchor, offset: anchor === "left" ? [-9, 0] : [0, 0] })
      .setLngLat(lngLat)
      .addTo(map);
  }

  function applySelection(s: MapState, fly: boolean) {
    const id = s.selectedId ?? s.focusId;
    const it = id ? s.visible.find((i) => i.id === id) : undefined;
    selMarker?.remove();
    selMarker = null;
    if (ready)
      for (const n of muni.neighborhoods)
        map.setFeatureState({ source: "bairros", id: n.slug }, { sel: Boolean(it && it.neighborhood === n.slug) });
    const p = it ? itemLngLat(it) : null;
    if (!it || !p) return;
    const label = isOpen(it) ? `${it.days} ${it.days === 1 ? "dia" : "dias"}` : "resolvido";
    selMarker = marker("fc-selpin", `<span></span><span>${label}</span>`, p, "left");
    if (fly) {
      const pad = opts.isPhone()
        ? { top: 120, bottom: opts.railHeight() + 20, left: 20, right: 20 }
        : { top: 40, bottom: 40, left: 40, right: 40 };
      map.easeTo({
        center: p,
        zoom: Math.max(map.getZoom(), 14.4),
        padding: pad,
        duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 750,
      });
    }
  }

  function applyHover(s: MapState) {
    hovMarker?.remove();
    hovMarker = null;
    const it = s.hoveredId && s.hoveredId !== s.selectedId ? s.visible.find((i) => i.id === s.hoveredId) : undefined;
    const p = it ? itemLngLat(it) : null;
    if (p) hovMarker = marker("fc-hovpin", "", p, "center");
  }

  /**
   * "Chuva agora" (round 23): each gauge as a pill with its last hour, a button that opens it in the
   * panel. HTML markers sit above the canvas, so they survive a style switch.
   */
  function applyGauges(s: MapState) {
    for (const m of gaugeMarkers) m.remove();
    gaugeMarkers = s.gauges.map((g) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "fc-gauge";
      el.dataset.rain = !g.stale && (g.lastHour ?? 0) > 0 ? "1" : "0";
      el.dataset.stale = g.stale ? "1" : "0";
      el.setAttribute("aria-pressed", String(s.selectedGauge === g.id));
      el.setAttribute("aria-label", gaugeLabel(g));
      el.innerHTML = `${RAIN_GLYPH}<span>${g.stale || g.lastHour === null ? "—" : mmLabel(g.lastHour)}</span>`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setGauge(mapStore.state.selectedGauge === g.id ? null : g.id);
      });
      return new ml.Marker({ element: el, anchor: "center" }).setLngLat(g.at).addTo(map);
    });
  }

  map.on("style.load", addLayers);
  map.on("click", "clusters", (e) => {
    const f = e.features?.[0];
    const clusterId = f?.properties?.cluster_id;
    const src = itemsSource();
    if (!f || typeof clusterId !== "number" || !src || f.geometry.type !== "Point") return;
    const center = f.geometry.coordinates;
    void src
      .getClusterExpansionZoom(clusterId)
      .then((z) => map.easeTo({ center: [center[0] ?? 0, center[1] ?? 0], zoom: z + 0.3, duration: 500 }));
  });
  for (const layer of ["points", "questions"]) {
    map.on("click", layer, (e) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") opts.onPick(id);
    });
    map.on("mouseenter", layer, (e) => {
      map.getCanvas().style.cursor = "pointer";
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") opts.intent?.rest(id);
    });
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
      opts.intent?.leave();
    });
    // The press comes a beat before the click (more on a touch screen): start loading the pin then.
    const press = (e: MapLayerMouseEvent | MapLayerTouchEvent) => {
      const id = e.features?.[0]?.properties?.id;
      if (typeof id === "string") opts.intent?.press(id);
    };
    map.on("mousedown", layer, press);
    map.on("touchstart", layer, press);
  }

  const sub = mapStore.subscribe((next) => {
    const prev = state;
    state = next;
    if (next.dark !== prev.dark) {
      ready = false;
      map.setStyle(styleUrl(next.dark));
      return;
    }
    if (next.visible !== prev.visible && ready) itemsSource()?.setData(featureCollection(next.visible));
    if (next.pinMode !== prev.pinMode || next.visible !== prev.visible) applyPins(next);
    if (next.selectedId !== prev.selectedId || next.focusId !== prev.focusId) applySelection(next, true);
    else if (next.visible !== prev.visible) applySelection(next, false);
    if (next.hoveredId !== prev.hoveredId) applyHover(next);
    if (next.gauges !== prev.gauges || next.selectedGauge !== prev.selectedGauge) applyGauges(next);
  });
  applyGauges(state);

  const api: MapControls = {
    zoomBy: (d: number) => map.zoomTo(map.getZoom() + d, { duration: 300 }),
    locate: () => map.easeTo({ center: viewer.location, zoom: 15, duration: 700 }),
    view: () => {
      const c = map.getCenter();
      return { center: [c.lng, c.lat], zoom: map.getZoom() };
    },
  };
  mapControls.current = api;

  return () => {
    sub.unsubscribe();
    mapControls.current = null;
    map.remove();
  };
}

/** lucide's cloud-rain, at the marker's size. */
const RAIN_GLYPH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>';

/** What a screen reader hears on a gauge: its name, its last hour and when, or that it's silent. */
export function gaugeLabel(g: GaugeNow): string {
  if (g.stale || g.lastHour === null) return `Pluviômetro ${g.name}: sem leitura recente`;
  return `Pluviômetro ${g.name}: ${mmLabel(g.lastHour)} na última hora`;
}

const setGauge = (id: number | null) => mapStore.setState((prev) => ({ ...prev, selectedGauge: id }));

export interface MapControls {
  zoomBy: (d: number) => void;
  locate: () => void;
  /** Where the map is looking (the report flow opens its picker there). */
  view: () => { center: [number, number]; zoom: number };
}

/** Imperative controls for things outside the map (buttons, the report flow). Set while a map is mounted. */
export const mapControls: { current: MapControls | null } = { current: null };
