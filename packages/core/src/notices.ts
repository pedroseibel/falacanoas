import { itemPath } from "./logic";
import type { Item } from "./types";

/**
 * What a notification says (DECISIONS round 15: following a pin or a place; BUILD 4.2). Plain text,
 * no alert styling (round 17: a false evacuation alert went out in 2024), and never who did it: the
 * pin's page shows that. `tag` groups notices about one pin, so a newer one replaces an older one.
 */
export interface Notice {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** What happened to a followed pin. Confirmations and "continua acontecendo" don't notify. */
export type ItemChange = { kind: "update"; text: string } | { kind: "photo" } | { kind: "resolved" };

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

export function itemNotice(it: Item, change: ItemChange): Notice {
  const body =
    change.kind === "update"
      ? `Atualização: “${clip(change.text, 140)}”`
      : change.kind === "photo"
        ? "Chegou uma foto nova."
        : "Os vizinhos confirmaram que foi resolvido.";
  return { title: clip(it.title, 80), body, url: itemPath(it.id), tag: `o-${it.id}` };
}

/**
 * A new pin inside a place someone follows: which place ("Casa", "Bairro Niterói", the followed
 * place's title) and what (the category's label).
 */
export function newItemNotice(it: Item, labels: { where: string; category: string }): Notice {
  const { where, category } = labels;
  return {
    title: `Novo registro · ${where}`,
    // A report with no text is titled by its category: say it once.
    body: it.title === category ? category : `${category}: ${clip(it.title, 120)}`,
    url: itemPath(it.id),
    tag: `o-${it.id}`,
  };
}

/**
 * Moderation is falling behind (BUILD 5.x, moderation capacity): cases have waited longer than
 * `hours` in the moderator's bairros. Names the bairros, busiest first, so the moderator knows where.
 */
export function moderationWaitingNotice(waiting: { bairro: string; count: number }[], hours: number): Notice {
  const total = waiting.reduce((n, w) => n + w.count, 0);
  const places = waiting
    .toSorted((a, b) => b.count - a.count || a.bairro.localeCompare(b.bairro, "pt-BR"))
    .map((w) => w.bairro);
  const where =
    places.length <= 2 ? places.join(" e ") : `${places.slice(0, 2).join(", ")} e mais ${places.length - 2}`;
  return {
    title: `Moderação: ${total === 1 ? "1 caso espera" : `${total} casos esperam`} há mais de ${hours} horas`,
    body: `Em ${where}.`,
    url: "/moderar",
    tag: "moderacao",
  };
}
