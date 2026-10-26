import { categoryOf, type Municipality } from "@fala/core";
import { Icon, categoryIcon } from "@/components/Icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Category pictogram + label. Pictograms are temporary (signage-norm redesign pending). */
export function CategoryLine({
  muni,
  category,
  where,
  extra,
  demo,
  wrap,
}: {
  muni: Municipality;
  category: string;
  where: string;
  extra?: string;
  /** Fictional demo data: labelled wherever it shows. */
  demo?: boolean;
  /** Narrow cards: up to two lines instead of cutting off the bairro and distance. */
  wrap?: boolean;
}) {
  return (
    <span className={cn("flex min-w-0 gap-1.5 text-xs text-muted-foreground", wrap ? "items-start" : "items-center")}>
      {/* A line-high box keeps the pictogram on the first line when the text wraps. */}
      <span className="grid h-4 shrink-0 place-items-center">
        <Icon name={categoryIcon(category)} size={16} />
      </span>
      <span className={wrap ? "line-clamp-2" : "truncate"}>
        {/* A no-break space before each dot: a wrapped line starts with "· 190 m", never ends on a dot. */}
        {[categoryOf(muni, category).label, where, extra].filter(Boolean).join(" ·\u00a0")}
      </span>
      {demo && <Badge variant="chip-inline">exemplo</Badge>}
    </span>
  );
}
