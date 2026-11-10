import { isOpen, type Item, type Municipality } from "@fala/core";
import { matchesWords, normalize, searchText } from "@/lib/search";

/**
 * What the ⌘K palette finds, as plain functions: pins ranked by where the words land (the code first,
 * then the title, the type, the bairro, the place), bairros by name, and the palette's own commands by
 * label and keywords. A pin counts with the same rule as the map's list, so "ver no mapa" shows the
 * number the palette promised.
 */

const startsWord = (text: string, w: string) => text.startsWith(w) || text.includes(` ${w}`);

function wordScore(t: ReturnType<typeof searchText>, w: string): number {
  if (t.id === w) return 100;
  if (w.length >= 2 && t.id.startsWith(w)) return 70;
  if (t.title.startsWith(w)) return 60;
  if (startsWord(t.title, w)) return 50;
  if (t.title.includes(w)) return 35;
  if (startsWord(t.category, w) || startsWord(t.bairro, w)) return 30;
  if (startsWord(t.place, w)) return 25;
  if (t.category.includes(w) || t.bairro.includes(w) || t.place.includes(w)) return 15;
  return 1;
}

/** Pins every word matches, best first; open before resolved, then the most recently active. */
export function rankPins(items: Item[], words: string[], muni: Municipality, limit: number) {
  if (!words.length) return { shown: [], total: 0 };
  const hits = items
    .map((it) => ({ it, text: searchText(it, muni) }))
    .filter(({ text }) => matchesWords(text, words))
    .map(({ it, text }) => ({ it, score: words.reduce((s, w) => s + wordScore(text, w), 0) }))
    .toSorted(
      (a, b) =>
        b.score - a.score ||
        Number(isOpen(b.it)) - Number(isOpen(a.it)) ||
        a.it.updatedMinutesAgo - b.it.updatedMinutesAgo,
    );
  return { shown: hits.slice(0, limit).map((h) => h.it), total: hits.length };
}

/** Bairros whose name has every word, with how many open problems each has. */
export function rankBairros(muni: Municipality, items: Item[], words: string[], limit: number) {
  if (!words.length) return [];
  return muni.neighborhoods
    .map((n) => ({ n, name: normalize(n.name) }))
    .filter(({ name }) => words.every((w) => name.includes(w)))
    .map(({ n, name }) => ({
      n,
      score: name.startsWith(words[0] ?? "") ? 2 : startsWord(name, words[0] ?? "") ? 1 : 0,
    }))
    .toSorted((a, b) => b.score - a.score || a.n.name.localeCompare(b.n.name, "pt-BR"))
    .slice(0, limit)
    .map(({ n }) => ({
      slug: n.slug,
      name: n.name,
      open: items.filter((it) => it.neighborhood === n.slug && isOpen(it)).length,
    }));
}

/** A bairro's name typed from its start leads the results: "centro" is a place before it's every pin there. */
export const bairroLeads = (bairros: { name: string }[], words: string[]) =>
  words.length > 0 && bairros.some((b) => normalize(b.name).startsWith(words.join(" ")));

export interface CommandSpec {
  label: string;
  keywords?: string[];
  /** Only once something is typed: it would crowd the empty palette. */
  typedOnly?: boolean;
}

/** The palette's own commands: all but the typed-only ones when empty; otherwise those every word matches. */
export function matchCommands<T extends CommandSpec>(commands: T[], words: string[]): T[] {
  if (!words.length) return commands.filter((c) => !c.typedOnly);
  const first = words[0] ?? "";
  return commands
    .map((c) => ({ c, label: normalize(c.label), keys: (c.keywords ?? []).map(normalize) }))
    .filter(({ label, keys }) => words.every((w) => label.includes(w) || keys.some((k) => k.includes(w))))
    .map(({ c, label, keys }) => ({
      c,
      score: label.startsWith(first)
        ? 3
        : startsWord(label, first)
          ? 2
          : keys.some((k) => startsWord(k, first))
            ? 1
            : 0,
    }))
    .toSorted((a, b) => b.score - a.score)
    .map(({ c }) => c);
}

/** "⌘ K" on Apple keyboards, "Ctrl K" elsewhere. */
export const shortcutKeys = (userAgent: string) =>
  /Mac OS X|Macintosh|iPhone|iPad/.test(userAgent) ? ["⌘", "K"] : ["Ctrl", "K"];

/** The way from the palette to the map's list, filtered by what was typed. */
export const seeOnMapLabel = (total: number, query: string) =>
  total === 1 ? `Ver no mapa o registro com “${query}”` : `Ver no mapa os ${total} registros com “${query}”`;
