import type { Municipality, Viewer } from "@fala/core";
import { useRef } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { PHONE_QUERY } from "@/lib/use-media-query";
import { onDarkChange, prefersDark } from "@/lib/theme";
import { mountMap } from "./map-engine";
import { setMapState, type MapState } from "./map-store";
import type { PinIntent } from "@/lib/pin-intent";

/** The map is an imperative island: mounted once, then driven by mapStore (see map-engine.ts). */
export function MapView({
  muni,
  viewer,
  initial,
  onPick,
  intent,
}: {
  muni: Municipality;
  viewer: Viewer;
  initial: Pick<MapState, "visible" | "selectedId">;
  onPick: (id: string) => void;
  intent?: PinIntent;
}) {
  const host = useRef<HTMLDivElement>(null);
  useMountEffect(() => {
    // Route lifecycle hooks don't run on hydration: seed the store from the server-rendered state.
    setMapState({ ...initial, dark: prefersDark() });
    // The basemap follows the page's theme, or dark chrome sits on a light map.
    const unfollow = onDarkChange(() => setMapState({ dark: prefersDark() }));
    let dispose: (() => void) | null = null;
    let cancelled = false;
    void Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl-worker.mjs?url")]).then(
      ([ml, worker]) => {
        if (cancelled || !host.current) return;
        ml.setWorkerUrl(worker.default);
        dispose = mountMap(ml, host.current, {
          muni,
          viewer,
          onPick,
          intent,
          isPhone: () => matchMedia(PHONE_QUERY).matches,
          railHeight: () => document.querySelector("[data-rail]")?.getBoundingClientRect().height ?? 170,
        });
      },
    );
    return () => {
      cancelled = true;
      unfollow();
      dispose?.();
    };
  });
  // MapLibre's unlayered CSS sets position:relative on its container, beating layered utilities,
  // so positioning lives on a wrapper it doesn't touch.
  return (
    <div className="absolute inset-0">
      <div
        ref={host}
        data-main-map
        className="size-full"
        role="region"
        aria-label={`Mapa de ${muni.name} com os registros`}
      />
    </div>
  );
}
