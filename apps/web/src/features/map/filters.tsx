import type { Municipality } from "@fala/core";
import { Icon, isIconName } from "@/components/Icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SORT_LABEL, SortSchema, type MapSearch, type Sort } from "./selectors";

export function FilterChips({ muni, value, onChange }: { muni: Municipality; value: string; onChange: (f: string) => void }) {
  return (
    <ToggleGroup
      aria-label="Filtrar registros"
      variant="outline"
      size="sm"
      value={[value]}
      onValueChange={(v) => onChange(v[0] ?? "tudo")}
      className="w-full overflow-x-auto"
    >
      {muni.filterGroups.map((g) => (
        <ToggleGroupItem key={g.key} value={g.key} aria-label={g.label}>
          {g.icon && isIconName(g.icon) && <Icon name={g.icon} size={14} />}
          {g.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function SortSelect({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  return (
    <Select
      items={SORT_LABEL}
      value={value}
      onValueChange={(v) => {
        const parsed = SortSchema.safeParse(v);
        if (parsed.success) onChange(parsed.data);
      }}
    >
      <SelectTrigger size="sm" aria-label="Ordenar registros">
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
