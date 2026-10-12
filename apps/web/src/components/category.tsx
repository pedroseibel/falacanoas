import { categoryOf, type Municipality } from "@fala/core";
import { Icon, categoryIcon } from "@/components/Icons";
import { Badge } from "@/components/ui/badge";

/** Category pictogram + label. Pictograms are temporary (signage-norm redesign pending). */
export function CategoryLine({
  muni,
  category,
  where,
  extra,
  demo,
}: {
  muni: Municipality;
  category: string;
  where: string;
  extra?: string;
  /** Fictional demo data: labelled wherever it shows. */
  demo?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <Icon name={categoryIcon(category)} size={13} />
      <span className="truncate">
        {categoryOf(muni, category).label} · {where}
        {extra ? ` · ${extra}` : ""}
      </span>
      {demo && <Badge variant="chip-inline">exemplo</Badge>}
    </span>
  );
}
