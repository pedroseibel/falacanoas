import { polygonsOf } from "@fala/core";
import type { NeighborhoodCollection, NeighborhoodFeature } from "@fala/core";
import { useMemo, useRef, useState, type PointerEvent, type FocusEvent } from "react";

/**
 * Data-viz primitives, built with the dataviz skill.
 * - DaysMeter: one series. Ink up to the reference deadline, a 2px surface gap, then signal
 *   the accent for the part over it ("needs attention"). Track is a lighter step of the same ramp.
 * - StatTile: label + value, sans semibold, proportional figures.
 * - Choropleth: 5-step neutral ordinal ramp (validated light and dark, light end >= 2:1),
 *   tooltip on hover and focus; the Placar bairro table is its table view.
 */

const pct = (d: number, max: number) => (Math.min(d, max) / max) * 100;

export function DaysMeter({
  days,
  deadline = 30,
  max = 60,
  size = "sm",
}: {
  days: number;
  deadline?: number;
  max?: number;
  size?: "sm" | "lg";
}) {
  const over = days > deadline;
  const d = pct(deadline, max);
  const bar = size === "lg" ? "h-2.5" : "h-2";
  return (
    <span
      className={size === "lg" ? "relative block h-8 min-w-32" : "relative block h-6 min-w-28"}
      role="img"
      aria-label={`${days} dias; referência de ${deadline} dias${over ? `, ${days - deadline} acima` : ""}`}
      title={`${days} dias`}
    >
      <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-r-full bg-track" />
      {over ? (
        <>
          <span
            className={`absolute top-1/2 left-0 -translate-y-1/2 bg-foreground ${bar}`}
            style={{ width: `calc(${d}% - 1px)` }}
          />
          <span
            className={`absolute top-1/2 -translate-y-1/2 rounded-r-full bg-signal ${bar}`}
            style={{ left: `calc(${d}% + 1px)`, width: `calc(${pct(days, max) - d}% - 1px)` }}
          />
        </>
      ) : (
        days > 0 && (
          <span
            className={`absolute top-1/2 left-0 -translate-y-1/2 rounded-r-full bg-foreground ${bar}`}
            style={{ width: `${pct(days, max)}%` }}
          />
        )
      )}
      <span className="absolute inset-y-0.5 w-px bg-muted-foreground" style={{ left: `${d}%` }}>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 text-2xs font-medium text-muted-foreground">
          {deadline}
        </span>
      </span>
    </span>
  );
}

export function StatTile({
  value,
  label,
  attention = false,
}: {
  value: number | string | null;
  label: string;
  attention?: boolean;
}) {
  return (
    <div className="grid content-start gap-0.5 px-4 py-3.5">
      <span
        className={
          attention ? "text-2xl font-semibold tracking-tight text-signal-text" : "text-2xl font-semibold tracking-tight"
        }
      >
        {value ?? "—"}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function project(features: NeighborhoodFeature[], width = 1000) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const f of features)
    for (const p of polygonsOf(f.geometry))
      for (const c of p[0] ?? []) {
        xs.push(c[0] ?? 0);
        ys.push(c[1] ?? 0);
      }
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs),
    y0 = Math.min(...ys),
    y1 = Math.max(...ys);
  const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  const W = width;
  const H = Math.round((W * (y1 - y0)) / ((x1 - x0) * k));
  const pt = (c: number[]) =>
    `${((((c[0] ?? 0) - x0) / (x1 - x0)) * W).toFixed(1)} ${(((y1 - (c[1] ?? 0)) / (y1 - y0)) * H).toFixed(1)}`;
  const path = (f: NeighborhoodFeature) =>
    polygonsOf(f.geometry)
      .map((p) => p.map((r) => `M${r.map(pt).join("L")}Z`).join(""))
      .join("");
  return { W, H, path };
}

const FILL = ["fill-seq-0", "fill-seq-1", "fill-seq-2", "fill-seq-3", "fill-seq-4", "fill-seq-5"];
const SWATCH = ["bg-seq-0", "bg-seq-1", "bg-seq-2", "bg-seq-3", "bg-seq-4", "bg-seq-5"];

export function Choropleth({
  geo,
  values,
  unit,
  label,
  onPick,
  selected = null,
}: {
  geo: NeighborhoodCollection;
  values: Record<string, number>;
  unit: string;
  label: string;
  onPick?: (slug: string) => void;
  selected?: string | null;
}) {
  const P = useMemo(() => project(geo.features), [geo.features]);
  const max = Math.max(1, ...Object.values(values));
  const step = Math.max(1, Math.ceil(max / 5));
  const bins = [1, 2, 3, 4, 5].map((i) => ({ i, from: (i - 1) * step + 1, to: i * step }));
  const binOf = (v: number) => (v <= 0 ? 0 : Math.min(5, Math.ceil(v / step)));
  const box = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; v: number } | null>(null);
  const showAt = (clientX: number, clientY: number, f: NeighborhoodFeature) => {
    const r = box.current?.getBoundingClientRect();
    if (r)
      setTip({ x: clientX - r.left, y: clientY - r.top, name: f.properties.name, v: values[f.properties.slug] ?? 0 });
  };
  const onFocus = (e: FocusEvent<SVGPathElement>, f: NeighborhoodFeature) => {
    const b = e.currentTarget.getBoundingClientRect();
    showAt(b.left + b.width / 2, b.top + b.height / 2, f);
  };
  return (
    <figure className="m-0">
      <div className="relative p-4" ref={box}>
        <svg viewBox={`0 0 ${P.W} ${P.H}`} role="group" aria-label={label} className="block h-auto w-full">
          {geo.features.map((f) => {
            const v = values[f.properties.slug] ?? 0;
            const on = selected === f.properties.slug;
            return (
              <path
                key={f.properties.slug}
                d={P.path(f)}
                tabIndex={0}
                role="button"
                vectorEffect="non-scaling-stroke"
                aria-label={`${f.properties.name}: ${v} ${unit}`}
                className={`${FILL[binOf(v)]} cursor-pointer outline-none ${on ? "stroke-signal stroke-3" : "stroke-card stroke-2 hover:stroke-foreground focus-visible:stroke-foreground"}`}
                onPointerMove={(e: PointerEvent<SVGPathElement>) => showAt(e.clientX, e.clientY, f)}
                onPointerLeave={() => setTip(null)}
                onFocus={(e) => onFocus(e, f)}
                onBlur={() => setTip(null)}
                onClick={() => onPick?.(f.properties.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onPick?.(f.properties.slug);
                  }
                }}
              />
            );
          })}
        </svg>
        {tip && (
          <div
            className="pointer-events-none absolute z-10 -mt-2.5 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2.5 py-1.5 text-xs whitespace-nowrap text-background shadow-soft"
            style={{ left: tip.x, top: tip.y }}
          >
            <b className="text-sm font-semibold">{tip.v}</b> {unit}
            <br />
            {tip.name}
          </div>
        )}
      </div>
      <figcaption className="flex items-start gap-0.5 px-4 pb-4 text-2xs text-muted-foreground" aria-hidden="true">
        <span className="grid flex-1 gap-1">
          <i className={`block h-2 rounded-l-full ${SWATCH[0]}`} />
          <span className="text-center">0</span>
        </span>
        {bins.map((b) => (
          <span className="grid flex-1 gap-1" key={b.i}>
            <i className={`block h-2 ${SWATCH[b.i]} ${b.i === 5 ? "rounded-r-full" : ""}`} />
            <span className="text-center tabular-nums">{b.from === b.to ? b.from : `${b.from}–${b.to}`}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
