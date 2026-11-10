import { matchesWords, queryWords, searchText } from "@/lib/search";
import { categoryOf, haversine, isOpen, type Item, itemLngLat, type LngLat, type Municipality } from "@fala/core";
import { z } from "zod";

export const SortSchema = z.enum(["perto", "antigos", "confirmados", "recentes"]);
export type Sort = z.infer<typeof SortSchema>;

/** Map search params: the URL is the source of truth for what the map shows. */
export const MapSearchSchema = z.object({
  f: z.string().optional(),
  sort: SortSchema.optional(),
  q: z.string().max(80).optional(),
});
export type MapSearch = z.infer<typeof MapSearchSchema>;

export const SORT_LABEL: Record<Sort, string> = {
  perto: "Perto de você",
  antigos: "Sem solução há mais tempo",
  confirmados: "Mais confirmados",
  recentes: "Atualizados agora",
};

/** "Agora": anything touched in the last 3 hours. */
const NOW_WINDOW_MINUTES = 180;

/** Distance to an item; bairro-wide items measure to their bairro's center; city-wide ones are infinitely far. */
export function distanceTo(me: LngLat, it: Item, muni: Municipality): number {
  const p = itemLngLat(it);
  if (p) return haversine(me, p);
  if (it.scope.type === "neighborhood") {
    const scope = it.scope;
    const n = muni.neighborhoods.find((b) => b.slug === scope.neighborhood);
    if (n) return haversine(me, n.center);
  }
  return Number.POSITIVE_INFINITY;
}

/** Ascending comparator that tolerates infinities (Infinity - Infinity is NaN). */
export const byDistance = (a: number, b: number) => (a === b ? 0 : a - b || (a > b ? 1 : -1));

export function visibleItems(items: Item[], search: MapSearch, muni: Municipality, me: LngLat): Item[] {
  const filter = search.f ?? "tudo";
  const words = queryWords(search.q ?? "");
  const kept = items.filter((it) => {
    if (filter === "agora" && it.updatedMinutesAgo > NOW_WINDOW_MINUTES) return false;
    if (filter !== "tudo" && filter !== "agora" && categoryOf(muni, it.category).group !== filter) return false;
    return !words.length || matchesWords(searchText(it, muni), words);
  });
  const sort = search.sort ?? "perto";
  const by: Record<Sort, (a: Item, b: Item) => number> = {
    perto: (a, b) => byDistance(distanceTo(me, a, muni), distanceTo(me, b, muni)),
    antigos: (a, b) => Number(isOpen(b)) - Number(isOpen(a)) || b.days - a.days,
    confirmados: (a, b) => b.confirmations - a.confirmations,
    recentes: (a, b) => a.updatedMinutesAgo - b.updatedMinutesAgo,
  };
  return kept.toSorted(by[sort]);
}
