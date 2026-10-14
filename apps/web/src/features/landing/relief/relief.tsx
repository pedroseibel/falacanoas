import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { cn } from "@/lib/utils";
import { RELIEF_ART as ART } from "./art.generated";
import { LOOP, PHASE_STARTS, readout, STILL_AT, stateAt, type ReliefState } from "./relief-model";

const IDLE_MS = 3600;
/** Where each arrow step lands inside its part of the tour (seconds in). */
const LANDING = [1.2, 1.5, 7.2, 2.2, 2.4];
const DROP_DAYS = 22; // how high above the map the pin starts, in days of height
const fine = (n: number) => Math.round(n * 100) / 100;
const up = (days: number) => `translate(${fine((ART.dayStep[0] ?? 0) * days)} ${fine((ART.dayStep[1] ?? 0) * days)})`;

interface Parts {
  seat: Element | null;
  clip: Element | null;
  cap: Element | null;
  capLate: Element | null;
  ring: Element | null;
  votes: Element[];
}

function apply(parts: Parts, s: ReliefState) {
  const shown = s.days * (1 - s.sink);
  parts.seat?.setAttribute("transform", up((1 - s.drop) * DROP_DAYS));
  parts.seat?.setAttribute("style", `opacity:${fine(s.drop * (1 - s.sink))}`);
  parts.clip?.setAttribute("transform", up(shown));
  const late = shown > ART.deadline;
  const caps: [Element | null, boolean][] = [
    [parts.cap, shown > 0.05 && !late],
    [parts.capLate, late],
  ];
  for (const [cap, on] of caps) {
    cap?.setAttribute("transform", up(shown));
    cap?.setAttribute("style", on ? "" : "display:none");
  }
  parts.ring?.setAttribute("style", `opacity:${fine(s.sink)}`);
  parts.votes.forEach((v, i) => v.toggleAttribute("data-on", s.votes > i));
}

/**
 * The hero's figure: Canoas as a tabletop relief, where every pin is a stack of days (relief-model.ts).
 * One pin in Niterói plays its life on a loop while the figure is on screen; the pointer scrubs time
 * across it and the arrow keys step from one part of the life to the next. Reduced motion shows one
 * still moment. The SVG is built by the Anatomy kit (figures/canoas-relief); this moves the tour pin.
 */
export function Relief({ deadline, className }: { deadline: number; className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const out = useRef<HTMLSpanElement>(null);
  const resting = readout(stateAt(STILL_AT), deadline);

  useMountEffect(() => {
    const el = stage.current;
    if (!el) return;
    const q = (part: string) => el.querySelector(`[data-part="${part}"]`);
    const parts: Parts = {
      seat: q("seat"),
      clip: q("clip"),
      cap: q("cap"),
      capLate: q("cap-late"),
      ring: q("ring"),
      votes: [q("vote-0"), q("vote-1")].filter((n) => n !== null),
    };
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let t = STILL_AT;
    let target = t;
    let touring = !still.matches;
    let visible = false;
    let frame = 0;
    let last = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;

    const draw = () => {
      const s = stateAt(t);
      apply(parts, s);
      const text = readout(s, deadline);
      if (out.current && out.current.textContent !== text) out.current.textContent = text;
      el.setAttribute("aria-valuetext", text);
      el.setAttribute("aria-valuenow", String(Math.round((t / LOOP) * 100)));
    };
    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;
      if (touring) {
        t = (t + dt) % LOOP;
        target = t;
      } else {
        // Scrubbing eases toward the pointer instead of jumping to it.
        t += (target - t) * (1 - Math.exp(-dt / 0.12));
        if (Math.abs(target - t) < 0.002) t = target;
      }
      draw();
      frame = visible && (touring || t !== target) ? requestAnimationFrame(tick) : 0;
    };
    const run = () => {
      if (!frame && visible && !still.matches) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    const steer = (next: number) => {
      touring = false;
      target = Math.min(LOOP - 0.001, Math.max(0, next));
      if (still.matches) {
        t = target;
        draw();
      }
      clearTimeout(idle);
      idle = setTimeout(() => {
        touring = !still.matches;
        run();
      }, IDLE_MS);
      run();
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.at(-1)?.isIntersecting ?? false;
        if (visible) run();
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(el);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const box = el.getBoundingClientRect();
      steer(((e.clientX - box.left) / box.width) * LOOP);
    };
    const onKey = (e: KeyboardEvent) => {
      const here = PHASE_STARTS.findLastIndex((start) => start <= target + 0.01);
      const end = PHASE_STARTS.length - 1;
      const step: Record<string, number> = {
        ArrowRight: Math.min(end, here + 1),
        ArrowUp: Math.min(end, here + 1),
        ArrowLeft: Math.max(0, here - 1),
        ArrowDown: Math.max(0, here - 1),
        Home: 0,
        End: end,
      };
      const to = step[e.key];
      if (to === undefined) return;
      e.preventDefault();
      // Land inside each part where its state reads: the pin seated, sent, tall, confirmed, closed.
      steer((PHASE_STARTS[to] ?? 0) + (LANDING[to] ?? 0));
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("keydown", onKey);
    const onMotion = () => {
      touring = !still.matches;
      if (still.matches) {
        t = target = STILL_AT;
        draw();
      } else run();
    };
    still.addEventListener("change", onMotion);
    draw();
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(idle);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("keydown", onKey);
      still.removeEventListener("change", onMotion);
    };
  });

  return (
    <figure className={cn("iso relative m-0", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-card shadow-panel">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4.5 top-4 z-1 flex items-center justify-between gap-3 font-mono text-micro text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <span className="text-ink-2">Canoas, 18 bairros</span>
            <Badge variant="chip">exemplo</Badge>
          </span>
          <span className="max-compact:hidden">um disco por dia em aberto</span>
        </div>
        <div
          ref={stage}
          tabIndex={0}
          role="slider"
          aria-label="Canoas em relevo, exemplo de um registro. Use as setas para passar de uma etapa à outra."
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((STILL_AT / LOOP) * 100)}
          aria-valuetext={resting}
          className="px-2 pt-10 pb-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:ring-inset max-compact:-mx-4 max-compact:px-0"
          // The drawing is generated at build time by the Anatomy kit (figures/canoas-relief/build.ts).
          dangerouslySetInnerHTML={{ __html: ART.svg }}
        />
        <div className="pointer-events-none absolute inset-x-4.5 bottom-4 z-1 flex items-center justify-between gap-3 font-mono text-micro text-muted-foreground">
          <span aria-hidden="true" className="shrink-0 pointer-coarse:hidden max-compact:hidden">
            passe o mouse · ← →
          </span>
          <span ref={out} aria-hidden="true" className="ml-auto truncate text-ink-2 tabular-nums">
            {resting}
          </span>
        </div>
      </div>
    </figure>
  );
}
