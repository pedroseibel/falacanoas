import { neighborhoodAt, type Item, type LngLat, type Municipality } from "@fala/core";
import { Loader2, LocateFixed } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { prefersDark } from "@/features/map/map-engine";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";
import { mountPicker, type Picker } from "./picker-engine";

/**
 * The map under a fixed crosshair (research/DECISIONS.md, round 15). An imperative island like the
 * main map: mounted once; `start` and `onMove` are read at mount.
 */
export function LocationPicker({
  muni,
  items,
  start,
  located,
  invalid,
  describedBy,
  onMove,
}: {
  muni: Municipality;
  items: Item[];
  start: { center: LngLat; zoom: number };
  /** A point is already placed; don't move it on our own. */
  located: boolean;
  invalid: boolean;
  describedBy: string;
  onMove: (at: LngLat) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const picker = useRef<Picker | null>(null);
  const [locating, setLocating] = useState(false);

  const locate = (quiet = false, precise = true) => {
    if (!("geolocation" in navigator)) {
      if (!quiet) toast("Este aparelho não informa a localização. Arraste o mapa até o lugar.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const at: LngLat = [pos.coords.longitude, pos.coords.latitude];
        if (!neighborhoodAt(at, muni.geo.neighborhoods)) {
          if (!quiet) toast(`Você parece estar fora de ${muni.name}. Arraste o mapa até o lugar.`);
          return;
        }
        picker.current?.flyTo(at);
      },
      (err) => {
        // A cheap phone's GPS can take longer than the wait; the network's guess is close enough to start.
        if (precise && err.code === err.TIMEOUT) return locate(quiet, false);
        setLocating(false);
        if (!quiet) toast("Não deu para saber onde você está. Arraste o mapa até o lugar.");
      },
      precise
        ? { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
        : { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    );
  };

  useMountEffect(() => {
    let cancelled = false;
    void Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl-worker.mjs?url")]).then(
      ([ml, worker]) => {
        if (cancelled || !host.current) return;
        ml.setWorkerUrl(worker.default);
        picker.current = mountPicker(ml, host.current, { muni, items, start, dark: prefersDark(), onMove });
        // Permission already given: go straight to the person, without a prompt.
        if (!located)
          void navigator.permissions
            ?.query({ name: "geolocation" })
            .then((p) => {
              if (!cancelled && p.state === "granted") locate(true);
            })
            .catch(() => undefined);
      },
    );
    return () => {
      cancelled = true;
      picker.current?.dispose();
      picker.current = null;
    };
  });

  return (
    <div
      // The drawer on phones closes on a downward swipe; dragging the map must not count as one.
      data-base-ui-swipe-ignore
      tabIndex={-1}
      role="group"
      aria-labelledby="r-onde"
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className={cn(
        "relative h-60 overflow-hidden rounded-xl border border-hairline bg-ground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-compact:h-52",
        invalid && "border-destructive",
      )}
    >
      {/* MapLibre sets position: relative on its container, so the positioning lives on this wrapper. */}
      <div className="absolute inset-0">
        <div ref={host} className="size-full" role="region" aria-label="Mapa para marcar o lugar" />
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-4.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-3 border-card bg-signal shadow-soft ring-6 ring-signal-wash"
      />
      <Button
        type="button"
        variant="floating"
        size="sm"
        className="absolute top-2.5 right-2.5"
        disabled={locating}
        onClick={() => locate()}
      >
        {locating ? (
          <Loader2 className="animate-spin" data-icon="inline-start" />
        ) : (
          <LocateFixed data-icon="inline-start" />
        )}
        Minha localização
      </Button>
    </div>
  );
}
