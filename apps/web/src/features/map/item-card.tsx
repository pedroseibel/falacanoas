import { communityLine, isOpen, relativeTime, type Item, type Municipality } from "@fala/core";
import { Check, VenetianMask } from "lucide-react";
import { CategoryLine } from "@/components/category";
import { Icon, categoryIcon } from "@/components/Icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PinIntent } from "./pin-intent";

export function whereOf(it: Item, muni: Municipality): string {
  const bairro = muni.neighborhoods.find((n) => n.slug === it.neighborhood)?.name ?? muni.name;
  if (it.scope.type === "municipality") return "Toda a cidade";
  if (it.scope.type === "place") return `${it.scope.label} · ${bairro}`;
  return bairro;
}

export function ItemCard({
  it,
  muni,
  selected,
  distance,
  layout = "list",
  onOpen,
  onHover,
  intent,
}: {
  it: Item;
  muni: Municipality;
  selected: boolean;
  distance?: string;
  layout?: "list" | "rail";
  onOpen: (id: string) => void;
  onHover?: (id: string | null) => void;
  /** Starts loading the pin when the pointer rests on the card, focus lands on it, or it's pressed. */
  intent?: PinIntent;
}) {
  const open = isOpen(it);
  const photo = it.photos[0];
  return (
    <button
      type="button"
      data-id={it.id}
      aria-current={selected || undefined}
      onClick={() => onOpen(it.id)}
      onPointerEnter={(e) => {
        onHover?.(it.id);
        if (e.pointerType === "mouse") intent?.rest(it.id);
      }}
      onPointerLeave={() => {
        onHover?.(null);
        intent?.leave();
      }}
      onPointerDown={() => intent?.press(it.id)}
      onFocus={() => intent?.rest(it.id)}
      className={cn(
        // A press answers at once, barely (tens of taps a day): 99%, back on release.
        "flex w-full gap-3 rounded-xl border p-2.5 text-left transition duration-160 ease-fluid outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-99 motion-reduce:active:scale-100",
        layout === "rail"
          ? "w-rail-card shrink-0 snap-start border-hairline bg-card shadow-float"
          : "border-transparent hover:bg-muted",
        selected && (layout === "rail" ? "border-foreground" : "border-foreground bg-card shadow-soft"),
      )}
    >
      <span className="relative grid size-21 shrink-0 place-items-center overflow-hidden rounded-lg border border-hairline bg-panel-3 text-muted-foreground">
        {photo ? (
          <img src={photo.src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <Icon name={categoryIcon(it.category)} size={28} />
        )}
        {/* On the thumbnail, so the label never costs the category line its bairro and distance. */}
        {it.demo && (
          <span className="absolute top-1 left-1 flex">
            <Badge variant="chip-inline">exemplo</Badge>
          </span>
        )}
        {it.visibility === "anonymous" && (
          <span
            className="absolute bottom-1 left-1 grid size-5 place-items-center rounded-md bg-card/90"
            title="Publicado como Anônimo"
          >
            <VenetianMask className="size-3" aria-hidden="true" />
            <span className="sr-only">Publicado como Anônimo</span>
          </span>
        )}
      </span>
      <span className="grid min-w-0 content-start gap-1">
        <CategoryLine
          muni={muni}
          category={it.category}
          where={whereOf(it, muni)}
          extra={distance}
          wrap={layout === "rail"}
        />
        <span className="line-clamp-2 text-sm leading-snug font-semibold tracking-tight wrap-anywhere">{it.title}</span>
        <span className="mt-0.5 flex min-w-0 items-baseline gap-2 text-xs whitespace-nowrap text-muted-foreground">
          {open ? (
            <span className="inline-flex items-baseline gap-1 text-ink-2">
              <b
                className={cn(
                  "text-base font-semibold text-foreground",
                  it.days > muni.deadlineDays && "text-signal-text",
                )}
              >
                {it.days}
              </b>
              {it.days === 1 ? "dia" : "dias"}
              {it.days > muni.deadlineDays && <span className="sr-only">, acima do prazo de referência</span>}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5" />
              <b className="text-base font-semibold">{it.days}</b>
              {it.days === 1 ? "dia" : "dias"}
            </span>
          )}
          <span className="text-hairline-strong">·</span>
          <span className="truncate">
            {communityLine(it)} · {relativeTime(it.updatedMinutesAgo)}
          </span>
        </span>
      </span>
    </button>
  );
}
