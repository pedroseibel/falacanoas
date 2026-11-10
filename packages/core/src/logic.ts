import type { Category, CommunityStatus, Item, ItemEvent, LngLat, Municipality } from "./types";

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

/** Where a confirmation takes each community state: the one table every "eu também" goes through. */
export const AFTER_CONFIRMATION: Record<CommunityStatus, CommunityStatus> = {
  reported: "confirmed",
  confirmed: "confirmed",
  ongoing: "ongoing",
  apparently_resolved: "ongoing",
  resolved: "resolved",
};

/** The point an item sits on; null for one about a whole bairro or the whole city. */
export function itemLngLat(it: Pick<Item, "scope">): LngLat | null {
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

/** Fixes a group needs before its median is shown: below that, one record would be the statistic. */
export const MIN_SAMPLE = 3;

export interface GroupStat {
  key: string;
  open: number;
  overDeadline: number;
  total: number;
  /** Median days to a community-confirmed fix; null below the minimum sample. */
  medianToFix: number | null;
  fixedWithinDeadlinePct: number;
}

export function groupStats(items: Item[], keyOf: (it: Item) => string | null, deadline: number): GroupStat[] {
  const g = new Map<string, { open: number; over: number; fixed: number[]; total: number }>();
  for (const it of items) {
    if (!onPlacar(it)) continue;
    const k = keyOf(it);
    if (!k) continue;
    const x = g.get(k) ?? { open: 0, over: 0, fixed: [], total: 0 };
    x.total++;
    if (isOpen(it)) x.open++;
    else x.fixed.push(it.days);
    if (isOverDeadline(it, deadline)) x.over++;
    g.set(k, x);
  }
  return [...g].map(([key, x]) => ({
    key,
    open: x.open,
    overDeadline: x.over,
    total: x.total,
    medianToFix: medianIfSampled(x.fixed),
    fixedWithinDeadlinePct: x.total ? Math.round((x.fixed.filter((d) => d <= deadline).length / x.total) * 100) : 0,
  }));
}

type Categories = Pick<Municipality, "categories">;
type Bairros = Pick<Municipality, "neighborhoods">;

/** The instance's category for a key; an unknown key reads as itself, routed nowhere. */
export function categoryOf(m: Categories, key: string): Category {
  return (
    m.categories.find((c) => c.key === key) ?? { key, label: key, group: "outros", agency: null, kind: "occurrence" }
  );
}
export const categoryLabel = (m: Categories, key: string) => categoryOf(m, key).label;

/** The bucket for a category the instance doesn't route anywhere: last, so it stands out. */
export const NO_AGENCY = "Sem órgão definido pelo Fala";
export const agencyOf = (m: Categories, key: string) => categoryOf(m, key).agency ?? NO_AGENCY;
/** Bodies in alphabetical order, the unrouted bucket last: an order, not a ranking. */
export const byAgency = (a: string, b: string) =>
  a === NO_AGENCY ? 1 : b === NO_AGENCY ? -1 : a.localeCompare(b, "pt-BR");

export function whereOf(it: Pick<Item, "scope" | "neighborhood">, muni: Bairros & Pick<Municipality, "name">): string {
  const bairro = bairroName(muni, it.neighborhood) ?? muni.name;
  if (it.scope.type === "municipality") return "Toda a cidade";
  if (it.scope.type === "place") return `${it.scope.label} · ${bairro}`;
  return bairro;
}

/** The instance's site: "https://falacanoas.com.br". */
export const siteUrl = (m: Pick<Municipality, "branding">) => `https://${m.branding.domain}`;
/** An item's page inside the site, and its full address. */
export const itemPath = (id: string) => `/o/${id}`;
export const itemUrl = (m: Pick<Municipality, "branding">, id: string) => `${siteUrl(m)}${itemPath(id)}`;

/** A group's median, once it has enough fixes to be one; null below that. */
export const medianIfSampled = (values: number[]) => (values.length >= MIN_SAMPLE ? median(values) : null);

/** A bairro's name from its slug; null for an unknown slug or none. */
export const bairroName = (m: Bairros, slug: string | null | undefined) =>
  m.neighborhoods.find((n) => n.slug === slug)?.name ?? null;

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
