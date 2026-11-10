import { type Go } from "@/components/app-link";
import type { NeighborhoodCollection } from "@fala/core";
import { useMemo, useRef, useState } from "react";
import { project } from "@/components/viz";
import { Bar, Panel } from "@/components/panel";
import { cn } from "@/lib/utils";
import { GhostPin } from "./ghost-pin";

/** Room around the city, in map units, so the ghost pin and its label sit inside the frame. */
const PAD = 30;
/**
 * Where the ghost pin stands: past the city's south-east corner, clear of every bairro, so it reads as
 * near the map but not on it.
 */
const GHOST = { x: 952, y: 858 };

const OUTLINE = "fill-foreground/2.5 stroke-foreground/30 stroke-1 transition-colors duration-200 ease-fluid";

/**
 * The 18 bairros, every one a link to its page, and a dashed pin outside the city line carrying the
 * address that led nowhere. Hover or focus names a bairro, as on the landing map.
 */
export function OffMap({
  geo,
  label,
  bairroHref,
  go,
  className,
}: {
  geo: NeighborhoodCollection;
  /** What the ghost pin's tag says: the missing path, or the missing bairro. */
  label: string;
  bairroHref: (slug: string) => string;
  go: Go;
  className?: string;
}) {
  const { W, H, paths } = useMemo(() => {
    const P = project(geo.features, 1000);
    return {
      W: P.W,
      H: P.H,
      paths: geo.features.map((f) => ({ slug: f.properties.slug, name: f.properties.name, d: P.path(f) })),
    };
  }, [geo]);
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; name: string } | null>(null);
  const showAt = (x: number, y: number, name: string) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setTip({ x: x - r.left, y: y - r.top, name });
  };
  const vw = W + PAD * 2;
  const vh = H + PAD * 2;
  const at = { left: `${((GHOST.x + PAD) / vw) * 100}%`, top: `${((GHOST.y + PAD) / vh) * 100}%` };
  return (
    <Panel className={className}>
      <Bar title="Canoas">
        <span>{paths.length} bairros</span>
      </Bar>
      <div ref={box} className="relative px-3 pt-2 pb-3">
        <svg viewBox={`${-PAD} ${-PAD} ${vw} ${vh}`} className="block h-auto w-full" aria-label="Bairros de Canoas">
          {paths.map((p) => {
            const link = go(bairroHref(p.slug));
            return (
              <a
                key={p.slug}
                href={link.href}
                onClick={link.onClick}
                aria-label={p.name}
                className="group outline-none"
                onPointerMove={(e) => showAt(e.clientX, e.clientY, p.name)}
                onPointerLeave={() => setTip(null)}
                onFocus={(e) => {
                  const b = e.currentTarget.getBoundingClientRect();
                  showAt(b.left + b.width / 2, b.top + b.height / 2, p.name);
                }}
                onBlur={() => setTip(null)}
              >
                <path
                  d={p.d}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  className={cn(
                    OUTLINE,
                    "cursor-pointer group-hover:fill-foreground/7 group-focus-visible:fill-foreground/7 group-focus-visible:stroke-foreground group-focus-visible:stroke-2",
                  )}
                />
              </a>
            );
          })}
        </svg>

        <span className="pointer-events-none absolute -translate-1/2" style={at}>
          <GhostPin className="size-5" />
        </span>
        {!tip && (
          <span
            className="pointer-events-none absolute z-10 max-w-4/5 -translate-x-full -translate-y-full truncate rounded-lg bg-foreground px-2.5 py-1.75 font-mono text-xs leading-snug text-background motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:delay-300 motion-safe:duration-500 motion-safe:fill-mode-both motion-safe:ease-fluid"
            // Its right edge just past the pin: a long address grows to the left, over the city.
            style={{ left: `calc(${at.left} + 1.25rem)`, top: `calc(${at.top} - 1rem)` }}
          >
            {label}
          </span>
        )}
        {tip && (
          <span
            role="status"
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2.5 py-1.75 text-xs leading-snug font-semibold whitespace-nowrap text-background"
            style={{ left: tip.x, top: tip.y - 12 }}
          >
            {tip.name}
          </span>
        )}
      </div>
    </Panel>
  );
}
