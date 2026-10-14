import type { NeighborhoodCollection } from "@fala/core";
import { useMemo, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { project } from "@/components/viz";
import { cn } from "@/lib/utils";

/** The example pin (the bus stop in Niterói), in the 1000 × 898 frame these maps were drawn in. */
const HOT_PIN = { x: 662.6, y: 786.4 };
const HERO_FRAME_HEIGHT = 898;

/** The 18 bairros as SVG, from the instance's own boundaries (same projection as the app's charts). */
function useOutlines(geo: NeighborhoodCollection) {
  return useMemo(() => {
    const P = project(geo.features, 1000);
    return {
      W: P.W,
      H: P.H,
      ky: P.H / HERO_FRAME_HEIGHT,
      paths: geo.features.map((f) => ({ slug: f.properties.slug, name: f.properties.name, d: P.path(f) })),
    };
  }, [geo]);
}

const OUTLINE = "fill-foreground/2.5 stroke-foreground/30 stroke-1 transition-colors duration-350 ease-fluid";
const SELECTED = "fill-signal-wash stroke-signal";

/** The composer's location preview: a crop around the example pin, its bairro selected. */
export function MiniMap({ geo, selected }: { geo: NeighborhoodCollection; selected: string }) {
  const { ky, paths } = useOutlines(geo);
  return (
    <svg viewBox={`470 ${600 * ky} 400 ${300 * ky}`} className="block h-auto w-full" aria-hidden="true">
      {paths.map((p) => (
        <path
          key={p.slug}
          d={p.d}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          className={cn(OUTLINE, p.slug === selected && SELECTED)}
        />
      ))}
      <circle
        cx={HOT_PIN.x}
        cy={HOT_PIN.y * ky}
        r={24}
        vectorEffect="non-scaling-stroke"
        className="fill-none stroke-signal stroke-1 opacity-55"
      />
      <circle
        cx={HOT_PIN.x}
        cy={HOT_PIN.y * ky}
        r={11}
        vectorEffect="non-scaling-stroke"
        className="fill-signal stroke-card stroke-3"
      />
    </svg>
  );
}

/** Pick a bairro on the map: hover or focus shows how many sign-ups are missing; click or Enter selects. */
export function PickMap({
  geo,
  selected,
  describe,
  label,
  onPick,
}: {
  geo: NeighborhoodCollection;
  selected: string;
  /** Tooltip and accessible name for a bairro, e.g. "faltam 52". */
  describe: (slug: string) => string;
  label: string;
  onPick: (slug: string) => void;
}) {
  const { W, H, paths } = useOutlines(geo);
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; slug: string; name: string } | null>(null);
  const showAt = (x: number, y: number, slug: string, name: string) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setTip({ x: x - r.left, y: y - r.top, slug, name });
  };
  return (
    <div ref={box} className="relative px-4.5 pt-3.5 pb-4.5">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={label} className="block h-auto w-full">
        {paths.map((p) => (
          <path
            key={p.slug}
            d={p.d}
            tabIndex={0}
            role="button"
            aria-pressed={p.slug === selected}
            aria-label={`${p.name}: ${describe(p.slug)}`}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            className={cn(
              OUTLINE,
              "cursor-pointer outline-none hover:fill-foreground/7 focus-visible:stroke-foreground focus-visible:stroke-2",
              p.slug === selected && "fill-signal-wash stroke-signal stroke-2 hover:fill-signal-wash",
            )}
            onPointerMove={(e: PointerEvent<SVGPathElement>) => showAt(e.clientX, e.clientY, p.slug, p.name)}
            onPointerLeave={() => setTip(null)}
            onFocus={(e: FocusEvent<SVGPathElement>) => {
              const b = e.currentTarget.getBoundingClientRect();
              showAt(b.left + b.width / 2, b.top + b.height / 2, p.slug, p.name);
            }}
            onBlur={() => setTip(null)}
            onClick={() => onPick(p.slug)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              onPick(p.slug);
            }}
          />
        ))}
      </svg>
      {tip && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2.5 py-1.75 text-xs leading-snug whitespace-nowrap text-background"
          style={{ left: tip.x, top: tip.y - 12 }}
        >
          <b className="font-semibold">{tip.name}</b> · {describe(tip.slug)}
        </div>
      )}
    </div>
  );
}
