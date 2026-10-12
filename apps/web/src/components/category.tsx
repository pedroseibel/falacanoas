import { categoryOf, type Municipality } from "@fala/core";
import { Icon, categoryIcon } from "@/components/Icons";

/** Category pictogram + label. Pictograms are temporary (signage-norm redesign pending). */
export function CategoryLine({
  muni,
  category,
  where,
  extra,
}: {
  muni: Municipality;
  category: string;
  where: string;
  extra?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <Icon name={categoryIcon(category)} size={13} />
      <span className="truncate">
        {categoryOf(muni, category).label} · {where}
        {extra ? ` · ${extra}` : ""}
      </span>
    </span>
  );
}
