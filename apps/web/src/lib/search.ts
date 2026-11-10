import { bairroName, categoryOf, type Item, type Municipality } from "@fala/core";

export const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** A search as words, accents and case aside; a code typed as "#7K3QF" is the code. */
export const queryWords = (q: string) =>
  normalize(q)
    .split(/\s+/)
    .map((w) => w.replace(/^#/, ""))
    .filter(Boolean);

/** What a search reads of an item, normalized: the map's list and the ⌘K palette search the same text. */
export function searchText(it: Item, muni: Municipality) {
  const bairro = bairroName(muni, it.neighborhood) ?? "";
  return {
    id: normalize(it.id),
    title: normalize(it.title),
    category: normalize(categoryOf(muni, it.category).label),
    bairro: normalize(bairro),
    place: normalize([it.scope.type === "place" ? it.scope.label : "", it.reference ?? "", it.address ?? ""].join(" ")),
  };
}

/** Every word appears somewhere: "buraco niteroi" finds the potholes in Niterói. */
export const matchesWords = (text: ReturnType<typeof searchText>, words: string[]) => {
  const hay = Object.values(text).join(" ");
  return words.every((w) => hay.includes(w));
};
