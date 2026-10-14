import type { Category, Item, ItemEvent, LngLat, Municipality } from "./types";

export function defineMunicipality(m: Municipality): Municipality {
  const keys = new Set<string>();
  for (const c of m.categories) {
    if (keys.has(c.key)) throw new Error(`Categoria duplicada: ${c.key}`);
    keys.add(c.key);
  }
  return m;
}

export const isOpen = (it: Item) => it.community !== "resolved";

/**
 * Independent confirmations an occurrence needs before it counts in the Placar: one for an account's
 * report, two for a guest pin (DECISIONS rounds 2 and 18, Q18). Until then one person can't move a
 * bairro's numbers; the item is still on the map and still in the daily digest.
 */
export const placarThreshold = (it: Pick<Item, "guest">) => (it.guest ? 2 : 1);
export const onPlacar = (it: Pick<Item, "kind" | "confirmations" | "guest">) =>
  it.kind === "occurrence" && it.confirmations >= placarThreshold(it);
export const isOverDeadline = (it: Item, deadline: number) => isOpen(it) && it.days > deadline;

export function itemLngLat(it: Item): LngLat | null {
  if (it.scope.type === "point") return [it.scope.lng, it.scope.lat];
  if (it.scope.type === "place" && it.scope.lng != null && it.scope.lat != null) return [it.scope.lng, it.scope.lat];
  return null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const a = values.toSorted((x, y) => x - y);
  const m = a.length >> 1;
  const mid = a[m] ?? 0;
  return a.length % 2 ? mid : Math.round(((a[m - 1] ?? mid) + mid) / 2);
}

const says = (n: number) => `${n} ${n === 1 ? "diz" : "dizem"}`;

/** One line a neighbour can read at a glance. Community voice first; official disagreement made explicit. */
export function communityLine(it: Item, confirmations = it.confirmations): string {
  if (it.kind === "public_issue") return `${says(confirmations)}: me afeta`;
  if (it.official?.status === "resolved" && it.community === "ongoing")
    return `Prefeitura: resolvido · ${says(it.disagreeing ?? confirmations)} que continua`;
  switch (it.community) {
    case "reported":
      return "aguardando confirmação";
    case "confirmed":
      return `${confirmations} ${confirmations === 1 ? "confirma" : "confirmam"}`;
    case "ongoing":
      return `${says(confirmations)} que continua`;
    case "apparently_resolved":
      return "parece resolvido";
    case "resolved":
      return "resolvido e confirmado";
  }
}

export interface GroupStat {
  key: string;
  open: number;
  overDeadline: number;
  total: number;
  /** Median days to a community-confirmed fix; null below the minimum sample. */
  medianToFix: number | null;
  fixedWithinDeadlinePct: number;
}

export function groupStats(
  items: Item[],
  keyOf: (it: Item) => string | null,
  deadline: number,
  minSample = 3,
): GroupStat[] {
  const g = new Map<string, { open: number; over: number; fixed: number[]; total: number }>();
  for (const it of items) {
    if (!onPlacar(it)) continue;
    const k = keyOf(it);
    if (!k) continue;
    const x = g.get(k) ?? { open: 0, over: 0, fixed: [], total: 0 };
    x.total++;
    if (isOpen(it)) {
      x.open++;
      if (it.days > deadline) x.over++;
    } else x.fixed.push(it.days);
    g.set(k, x);
  }
  return [...g].map(([key, x]) => ({
    key,
    open: x.open,
    overDeadline: x.over,
    total: x.total,
    medianToFix: x.fixed.length >= minSample ? median(x.fixed) : null,
    fixedWithinDeadlinePct: x.total ? Math.round((x.fixed.filter((d) => d <= deadline).length / x.total) * 100) : 0,
  }));
}

export function categoryOf(m: Municipality, key: string): Category {
  return (
    m.categories.find((c) => c.key === key) ?? { key, label: key, group: "outros", agency: null, kind: "occurrence" }
  );
}

/** Derive a readable history when an item has no stored events (fixtures, legacy). */
export function deriveEvents(it: Item, dateAgo: (days: number) => string): ItemEvent[] {
  if (it.events?.length) return it.events;
  const who = it.visibility === "anonymous" ? "Anônimo" : (it.author ?? "Anônimo");
  const ev: ItemEvent[] = [
    {
      at: dateAgo(it.days),
      actor: who,
      kind: "created",
      text: it.photos.length ? "Registrou com foto." : "Registrou.",
    },
    {
      at: `${dateAgo(it.days)} · 18:00`,
      actor: "Fala",
      kind: "sent_to_authority",
      text: "Enviado à Prefeitura no resumo diário. O relógio começou.",
    },
  ];
  if (it.confirmations > 0)
    ev.push({
      at: dateAgo(Math.max(it.days - 2, 0)),
      actor: `${it.confirmations} ${it.confirmations === 1 ? "morador" : "moradores"}`,
      kind: "confirmed",
      text: it.kind === "public_issue" ? "Disseram que isso também os afeta." : "Confirmaram que está acontecendo.",
    });
  if (it.official)
    ev.push({
      at: dateAgo(it.official.daysAgo),
      actor: it.official.agency,
      kind: it.official.status === "resolved" ? "official_status_changed" : "official_response",
      text: it.official.status === "resolved" ? "Marcou como resolvido." : "“Demanda recebida e encaminhada.”",
    });
  if (it.disagreeing)
    ev.push({ at: "hoje", actor: `${it.disagreeing} moradores`, kind: "confirmed", text: "Dizem que continua." });
  if (it.community === "resolved")
    ev.push({
      at: dateAgo(0),
      actor: "2 vizinhos",
      kind: "community_resolved",
      text: `Confirmaram o conserto. Fechado em ${it.days} dias.`,
    });
  return ev;
}
