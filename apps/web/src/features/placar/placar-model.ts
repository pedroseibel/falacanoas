import { categoryOf, groupStats, isOpen, median, type GroupStat, type Item, type Municipality } from "@fala/core";
import { z } from "zod";

export const PlacarViewSchema = z.enum(["tipo", "orgao", "bairro"]);
export type PlacarView = z.infer<typeof PlacarViewSchema>;

export interface PlacarRow extends GroupStat {
  name: string;
  /** Bairro slug when the row links to a bairro page. */
  bairro: string | null;
}

export function placarRows(items: Item[], muni: Municipality, view: PlacarView): PlacarRow[] {
  const key = {
    tipo: (it: Item) => it.category,
    orgao: (it: Item) => categoryOf(muni, it.category).agency ?? "Sem órgão definido",
    bairro: (it: Item) => it.neighborhood,
  }[view];
  return groupStats(items, key, muni.deadlineDays).map((g) => ({
    ...g,
    name:
      view === "tipo"
        ? categoryOf(muni, g.key).label
        : view === "bairro"
          ? (muni.neighborhoods.find((n) => n.slug === g.key)?.name ?? g.key)
          : g.key,
    bairro: view === "bairro" ? g.key : null,
  }));
}

export function placarKpis(items: Item[], deadline: number) {
  const occ = items.filter((i) => i.kind === "occurrence");
  const open = occ.filter(isOpen);
  const fixed = occ.filter((i) => !isOpen(i)).map((i) => i.days);
  return {
    open: open.length,
    overDeadline: open.filter((i) => i.days > deadline).length,
    medianToFix: median(fixed),
    fixed: fixed.length,
  };
}

/** Open occurrences past the deadline, per bairro (choropleth values). */
export function overDeadlineByBairro(items: Item[], deadline: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items)
    if (it.kind === "occurrence" && isOpen(it) && it.days > deadline && it.neighborhood)
      out[it.neighborhood] = (out[it.neighborhood] ?? 0) + 1;
  return out;
}

/** New records per week, oldest first, for the last `weeks` weeks. Week 0 is the current week. */
export function weeklyNew(items: Item[], weeks = 12): { week: string; count: number }[] {
  const counts = Array.from({ length: weeks }, () => 0);
  for (const it of items) {
    const w = Math.floor(it.days / 7);
    if (w < weeks) counts[w] = (counts[w] ?? 0) + 1;
  }
  return counts.map((count, w) => ({ week: w === 0 ? "esta" : `-${w}`, count })).toReversed();
}
