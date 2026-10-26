import type { Municipality } from "@fala/core";
import { Icon, isIconName } from "@/components/Icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SORT_LABEL, SortSchema, type MapSearch, type Sort } from "./selectors";

export function FilterChips({
  muni,
  value,
  onChange,
}: {
  muni: Municipality;
  value: string;
  onChange: (f: string) => void;
}) {
  return (
    // The scroller pads itself by the focus ring's width (and pulls back by as much), so a focused chip's
    // ring isn't cut by the overflow.
    <div className="-m-1 overflow-x-auto p-1 scrollbar-none">
      <ToggleGroup
        aria-label="Filtrar registros"
        variant="outline"
        size="sm"
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? "tudo")}
        className="w-max"
      >
        {muni.filterGroups.map((g) => (
          <ToggleGroupItem key={g.key} value={g.key} aria-label={g.label}>
            {g.icon && isIconName(g.icon) && <Icon name={g.icon} size={16} className="size-4 shrink-0" />}
            {g.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function SortSelect({
  value,
  onChange,
  floating,
}: {
  value: Sort;
  onChange: (s: Sort) => void;
  /** Over the map (phones), where it needs its own surface. */
  floating?: boolean;
}) {
  return (
    <Select
      items={SORT_LABEL}
      value={value}
      onValueChange={(v) => {
        const parsed = SortSchema.safeParse(v);
        if (parsed.success) onChange(parsed.data);
      }}
    >
      <SelectTrigger size="sm" variant={floating ? "floating" : "default"} aria-label="Ordenar registros">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SortSchema.options.map((s) => (
          <SelectItem key={s} value={s}>
            {SORT_LABEL[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const currentFilter = (s: MapSearch) => s.f ?? "tudo";
export const currentSort = (s: MapSearch): Sort => s.sort ?? "perto";
