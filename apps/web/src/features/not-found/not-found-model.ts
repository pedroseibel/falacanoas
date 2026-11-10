import type { Neighborhood } from "@fala/core";

/**
 * What a missing address was probably after, in plain functions: a bairro typed with accents,
 * spaces or capitals ("São José", "mathias velho"), one typed nearly right ("guajuvira"), or a pin's
 * code typed straight after the domain ("/7K3QF").
 */

/** "São José" → "sao-jose": how a typed bairro compares with the slugs. */
export function normalizeSlug(input: string): string {
  let s = input;
  try {
    s = decodeURIComponent(input);
  } catch {
    // A stray "%" is just a character here.
  }
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++)
      row.push(
        Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)),
      );
    prev = row;
  }
  return prev[b.length] ?? 0;
}

export interface BairroMatch<B> {
  /** The same bairro, only written differently: worth a redirect. */
  exact: B | null;
  /** Close enough to ask "você quis dizer…?", best first, at most three. */
  near: B[];
}

export function findBairro<B extends Pick<Neighborhood, "slug" | "name">>(input: string, list: B[]): BairroMatch<B> {
  const n = normalizeSlug(input);
  if (!n) return { exact: null, near: [] };
  const exact = list.find((b) => b.slug === n || normalizeSlug(b.name) === n) ?? null;
  if (exact) return { exact, near: [] };
  const scored = list
    .map((b) => {
      const words = b.slug.split("-");
      // A start of the name ("mathias", "sao"), or one of its words ("velho"), from three letters.
      if (n.length >= 3 && (b.slug.startsWith(n) || words.some((w) => w.length >= 4 && w === n)))
        return { b, score: 0 };
      // A typo: about one wrong letter in four.
      const d = Math.min(distance(n, b.slug), ...words.filter((w) => w.length >= 5).map((w) => distance(n, w)));
      return { b, score: d <= Math.max(1, Math.floor(n.length / 4)) ? d : Infinity };
    })
    .filter((s) => s.score < Infinity)
    .toSorted((x, y) => x.score - y.score || x.b.name.localeCompare(y.b.name, "pt-BR"));
  return { exact: null, near: scored.slice(0, 3).map((s) => s.b) };
}

/**
 * A pin's code, as people paste or type it: five letters and digits. Five plain lowercase letters
 * are more likely a word ("sobre"), so those need a digit or capitals.
 */
export const looksLikeCode = (s: string) => /^[A-Za-z0-9]{5}$/.test(s) && (/\d/.test(s) || s === s.toUpperCase());

export type Hint = { kind: "pin"; id: string } | { kind: "bairro"; slug: string; name: string };

/** Where a missing address may have meant to go, judged by its last part. */
export function pathHints(pathname: string, list: Pick<Neighborhood, "slug" | "name">[]): Hint[] {
  const last = pathname.split("/").findLast(Boolean);
  if (!last) return [];
  if (looksLikeCode(last)) return [{ kind: "pin", id: last.toUpperCase() }];
  const { exact, near } = findBairro(last, list);
  return (exact ? [exact] : near.slice(0, 2)).map((b) => ({ kind: "bairro", slug: b.slug, name: b.name }));
}

/** How the missing address reads on the page: no domain, no query, and short. */
export function shownPath(pathname: string, max = 40): string {
  let p = pathname;
  try {
    p = decodeURI(pathname);
  } catch {
    // Keep it encoded.
  }
  return p.length > max ? `${p.slice(0, max - 1)}…` : p;
}
