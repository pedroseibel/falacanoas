import type { Photo } from "@fala/core";
import { Camera, ChevronLeft, ChevronRight, Flag, ScanEye } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A pin's photos over time. The big photo is a native scroll-snap strip, so a finger swipes it with
 * the phone's own momentum; arrows (on hover with a mouse, always under a finger), the arrow keys and
 * the thumbnails move it too. Photos still waiting for moderation's first look are a tile, never an
 * image. The last slot below adds today's photo.
 */
export function PhotoViewer({
  photos,
  pending = 0,
  title,
  adding,
  onAdd,
  onReport,
}: {
  photos: Photo[];
  /** Photos sent but not yet looked at by moderation. */
  pending?: number;
  /** The pin's title, for the photos' alt text. */
  title: string;
  adding: boolean;
  onAdd: () => void;
  /** "Denunciar" on the photo in view; absent where reporting doesn't apply. */
  onReport?: (photo: Photo) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const current = Math.min(index, count - 1);

  const goTo = (i: number) => {
    const k = Math.max(0, Math.min(count - 1, i));
    setIndex(k);
    const el = strip.current;
    if (el) el.scrollTo({ left: k * el.clientWidth, behavior: reducedMotion() ? "auto" : "smooth" });
  };
  // A swipe or a trackpad moves the strip: the photo nearest the middle is the current one.
  const onScroll = () => {
    const el = strip.current;
    if (el?.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    goTo(current + (e.key === "ArrowRight" ? 1 : -1));
  };

  const arrow =
    "absolute top-1/2 -translate-y-1/2 transition-opacity duration-200 ease-fluid pointer-fine:opacity-0 pointer-fine:group-hover/viewer:opacity-100 focus-within:opacity-100";
  const shown = photos[current];
  return (
    <figure className="m-0">
      <div className="group/viewer relative bg-panel-3">
        <div
          ref={strip}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={count > 1 ? 0 : -1}
          role="group"
          aria-roledescription="carrossel"
          aria-label={`Fotos do registro, ${current + 1} de ${count}`}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          {photos.map((p, k) => (
            <div key={`${p.src}|${p.takenAt}`} className="relative w-full shrink-0 snap-center snap-always">
              <img
                src={p.src}
                alt={`Foto do registro: ${title}${count > 1 ? ` (${k + 1} de ${count})` : ""}`}
                loading={k === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                className="aspect-4/3 w-full object-cover select-none"
              />
              <span className="absolute top-3 left-3 rounded-md bg-foreground/70 px-2 py-1.5 font-mono text-xs text-background">
                {p.takenAt} · {p.by}
              </span>
              {p.credit && (
                <span className="absolute right-2.5 bottom-2.5 rounded-md bg-foreground/60 px-1.5 py-0.5 text-2xs text-background">
                  {p.credit}
                </span>
              )}
            </div>
          ))}
        </div>
        {count > 1 && (
          <>
            <span className={cn(arrow, "left-3", current === 0 && "pointer-events-none invisible")}>
              <Button variant="floating" size="icon-lg" aria-label="Foto anterior" onClick={() => goTo(current - 1)}>
                <ChevronLeft />
              </Button>
            </span>
            <span className={cn(arrow, "right-3", current === count - 1 && "pointer-events-none invisible")}>
              <Button variant="floating" size="icon-lg" aria-label="Próxima foto" onClick={() => goTo(current + 1)}>
                <ChevronRight />
              </Button>
            </span>
            <span
              aria-hidden="true"
              className="absolute bottom-2.5 left-2.5 rounded-md bg-foreground/60 px-1.5 py-0.5 font-mono text-2xs text-background tabular-nums"
            >
              {current + 1}/{count}
            </span>
          </>
        )}
      </div>
      <div className="flex items-start gap-2 border-b border-hairline bg-card py-2.5 pr-2.5 pl-4">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto" role="group" aria-label="Fotos ao longo do tempo">
          {photos.map((p, k) => (
            <button
              key={`${p.src}|${p.takenAt}`}
              type="button"
              aria-pressed={k === current}
              aria-label={`Foto de ${p.takenAt}`}
              onClick={() => goTo(k)}
              className="group/thumb grid shrink-0 gap-1 rounded-md text-left outline-none"
            >
              <img
                src={p.src}
                alt=""
                loading="lazy"
                className={cn(
                  "h-14 w-19 rounded-md object-cover ring-offset-2 ring-offset-card transition-shadow duration-200 ease-fluid group-focus-visible/thumb:ring-3 group-focus-visible/thumb:ring-ring/50",
                  k === current ? "ring-2 ring-foreground" : "opacity-80 hover:opacity-100",
                )}
              />
              <small className="font-mono text-2xs leading-4 text-muted-foreground">{p.takenAt.split(" · ")[0]}</small>
            </button>
          ))}
          {pending > 0 && (
            <span className="grid shrink-0 gap-1" title="A moderação olha cada foto antes de ela aparecer.">
              <span className="grid h-14 w-19 place-items-center rounded-md border border-dashed border-hairline-strong bg-panel-3 text-muted-foreground">
                <ScanEye className="size-4" aria-hidden="true" />
              </span>
              <small className="font-mono text-2xs leading-4 text-muted-foreground">
                {pending === 1 ? "em análise" : `${pending} em análise`}
              </small>
            </span>
          )}
          <button
            type="button"
            className="group/thumb grid shrink-0 gap-1 rounded-md text-left outline-none"
            disabled={adding}
            onClick={onAdd}
          >
            <span className="grid h-14 w-19 place-items-center rounded-md border border-dashed border-hairline-strong bg-muted text-muted-foreground transition-colors duration-200 ease-fluid group-hover/thumb:text-foreground group-focus-visible/thumb:ring-3 group-focus-visible/thumb:ring-ring/50">
              <Camera className="size-4" />
            </span>
            <small className="font-mono text-2xs leading-4 text-muted-foreground">foto atual</small>
          </button>
        </div>
        {onReport && shown?.id && (
          <Button
            variant="quiet"
            size="icon-sm"
            aria-label={`Denunciar a foto de ${shown.takenAt}`}
            onClick={() => onReport(shown)}
          >
            <Flag />
          </Button>
        )}
      </div>
    </figure>
  );
}
