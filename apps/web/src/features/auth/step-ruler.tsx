import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STOPS = ["Celular", "Código", "Apelido e bairro"];
/** Thirteen ticks, twelve spaces (the scoreboard ruler's twelfths); every fourth marks a step. */
const TICKS = Array.from({ length: 13 }, (_, i) => i);
/**
 * Where progress rests: on the middle tick of the current step, or the last tick when done. Fill and
 * needle share these positions, so they move in lockstep and meet on the same pixel.
 */
const FILL = { 0: "w-1/6", 1: "w-1/2", 2: "w-5/6", done: "w-full" };
const NEEDLE = { 0: "left-1/6", 1: "left-1/2", 2: "left-5/6", done: "left-full" };
/** Where they start when the page mounts, so /bem-vindo picks up where /entrar stopped. */
const FROM = {
  start: { fill: "starting:w-0", needle: "starting:left-0" },
  code: { fill: "starting:w-1/2", needle: "starting:left-1/2" },
};

/**
 * Sign-in progress as a ruler. Every mark is its own 1px box that ends exactly on its position
 * (the first starts on it), so ticks, the 2px progress line and the 2px needle snap to the same
 * pixels: the needle covers the tick it stands on and the line ends under the needle.
 */
export function StepRuler({
  at,
  done = false,
  from = "start",
}: {
  at: 0 | 1 | 2;
  done?: boolean;
  from?: keyof typeof FROM;
}) {
  const stop = done ? "done" : at;
  return (
    <div className="grid gap-2.5">
      <div aria-hidden="true" className="relative h-4.5">
        <span className="absolute inset-x-0 bottom-0 h-px bg-border" />
        {TICKS.map((i) => (
          <span
            key={i}
            className={cn(
              "absolute bottom-0 w-px",
              i > 0 && "-ml-px",
              i % 4 === 0 ? "h-3 bg-hairline-strong" : "h-1.5 bg-border",
            )}
            style={{ left: `${(i / 12) * 100}%` }}
          />
        ))}
        <span
          className={cn(
            "absolute bottom-0 left-0 h-0.5 bg-foreground transition-all duration-700 ease-fluid motion-reduce:transition-none",
            FILL[stop],
            FROM[from].fill,
          )}
        />
        <span
          className={cn(
            "absolute bottom-0 -ml-0.5 h-4.5 w-0.5 rounded-full bg-foreground transition-all duration-700 ease-fluid motion-reduce:transition-none",
            NEEDLE[stop],
            FROM[from].needle,
          )}
        />
      </div>
      <ol aria-label="Etapas para entrar" className="grid grid-cols-3 text-caption">
        {STOPS.map((label, i) => {
          const past = done || i < at;
          return (
            <li
              key={label}
              aria-current={!done && i === at ? "step" : undefined}
              className={cn(
                "flex items-center gap-1",
                past ? "text-ink-2" : i === at ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {past && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
              {label}
              {past && <span className="sr-only">(feito)</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
