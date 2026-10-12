import { communityLine, isOpen, relativeTime, type Item, type Municipality } from "@fala/core";
import { Check, VenetianMask } from "lucide-react";
import { CategoryLine } from "@/components/category";
import { Icon, categoryIcon } from "@/components/Icons";
import { cn } from "@/lib/utils";

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
}: {
  it: Item;
  muni: Municipality;
  selected: boolean;
  distance?: string;
  layout?: "list" | "rail";
  onOpen: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  const open = isOpen(it);
  const photo = it.photos[0];
  return (
    <button
      type="button"
      data-id={it.id}
      onClick={() => onOpen(it.id)}
      onPointerEnter={() => onHover?.(it.id)}
      onPointerLeave={() => onHover?.(null)}
      className={cn(
        "flex w-full gap-3 rounded-xl border p-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        layout === "rail"
          ? "w-80 shrink-0 snap-start border-hairline bg-card shadow-float"
          : "border-transparent hover:bg-muted",
        selected && (layout === "rail" ? "border-foreground" : "border-border bg-card shadow-soft"),
      )}
    >
      <span className="relative grid size-21 shrink-0 place-items-center overflow-hidden rounded-lg border border-hairline bg-panel-3 text-muted-foreground">
        {photo ? (
          <img src={photo.src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <Icon name={categoryIcon(it.category)} size={28} />
        )}
        {it.visibility === "anonymous" && (
          <span
            className="absolute bottom-1 left-1 grid size-5 place-items-center rounded-md bg-card/90"
            title="Publicado como Anônimo"
          >
            <VenetianMask className="size-3" />
          </span>
        )}
      </span>
      <span className="grid min-w-0 content-start gap-1">
        <CategoryLine muni={muni} category={it.category} where={whereOf(it, muni)} extra={distance} />
        <span className="line-clamp-2 text-sm leading-snug font-semibold tracking-tight">{it.title}</span>
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
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5" />
              <b className="text-base font-semibold">{it.days}</b>dias
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
