import { missingSignups, type Neighborhood } from "@fala/core";

/** pt-BR thousands: 1470 → "1.470". */
export const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const byName = (a: Neighborhood, b: Neighborhood) => a.name.localeCompare(b.name, "pt-BR");

/** Alphabetical, as in the select. */
export const bairrosByName = (all: Neighborhood[]) => all.toSorted(byName);

/** Bairros with a queue first, then the small ones that open with the first. */
export const bairrosByQueue = (all: Neighborhood[]) => [
  ...all.filter((b) => b.threshold).toSorted(byName),
  ...all.filter((b) => !b.threshold).toSorted(byName),
];

export type QueueState =
  | { kind: "none" }
  | { kind: "withFirst"; name: string }
  | { kind: "full"; name: string }
  | { kind: "missing"; name: string; missing: number };

export function queueState(b: Neighborhood | undefined, confirmed: Record<string, number>): QueueState {
  if (!b) return { kind: "none" };
  if (!b.threshold) return { kind: "withFirst", name: b.name };
  const missing = missingSignups(b.threshold, confirmed[b.slug] ?? 0);
  return missing ? { kind: "missing", name: b.name, missing } : { kind: "full", name: b.name };
}

/** 20 slots per bairro, lit in proportion to the confirmed queue. */
export const litSlots = (threshold: number | null, confirmed: number) =>
  threshold ? Math.min(20, Math.round((confirmed / threshold) * 20)) : 0;

export function shareUrl(domain: string, slug: string) {
  return `https://${domain}/?b=${slug}`;
}

export function shareMessage(domain: string, b: Neighborhood) {
  const tail = b.threshold
    ? `Quando ${fmt(b.threshold)} vizinhos entrarem, o mapa abre aqui`
    : "O mapa abre aqui junto com o primeiro bairro que encher a fila";
  return `Entrei na fila do Fala, Canoas para ${b.name}. ${tail} e cada problema da rua passa a ser contado em dias, em público. Entra também: ${shareUrl(domain, b.slug)}`;
}

/* ---------- Example content (fictional, labelled "exemplo" on the page) ---------- */

/** Pins on the hero map, in the 1000 × 898 frame the landing page was drawn in. */
export const HERO_PINS: { x: number; y: number; done?: boolean }[] = [
  { x: 161.3, y: 345.1 },
  { x: 301.3, y: 331.1 },
  { x: 421.3, y: 349.1, done: true },
  { x: 198.2, y: 425.9 },
  { x: 303.2, y: 399.5, done: true },
  { x: 772.7, y: 341.6 },
  { x: 852.7, y: 221.6 },
  { x: 468.5, y: 409.3 },
  { x: 476.5, y: 518.3, done: true },
  { x: 395.4, y: 820.7 },
  { x: 750.8, y: 464.8 },
  { x: 414.3, y: 626.4, done: true },
  { x: 627.0, y: 323.1 },
  { x: 828.0, y: 511.9 },
  { x: 652.5, y: 211.6, done: true },
  { x: 349.6, y: 505.9 },
  { x: 159.6, y: 605.9 },
  { x: 643.9, y: 629.8 },
  { x: 587.6, y: 474.0 },
  { x: 310.2, y: 282.7, done: true },
  { x: 572.6, y: 746.4 },
  { x: 725.6, y: 800.4, done: true },
];
/** The example pin (the bus stop in Niterói). */
export const HOT_PIN = { x: 662.6, y: 786.4 };
export const HERO_FRAME_HEIGHT = 898;

export const MINI_SCORE = [
  { label: "Poste apagado", days: 12 },
  { label: "Boca de lobo entupida", days: 27 },
  { label: "Buraco na rua", days: 41 },
];

export const DIGEST_ROWS = [
  { time: "17:42", what: "Rua que alaga toda chuva", where: "Niterói" },
  { time: "16:05", what: "Poste apagado", where: "Guajuviras" },
  { time: "14:31", what: "Boca de lobo entupida", where: "Mathias Velho" },
  { time: "11:18", what: "Buraco na rua", where: "Estância Velha" },
  { time: "09:56", what: "Entulho", where: "Harmonia" },
];

/** Scoreboard "por tipo": median days to a confirmed fix and the share fixed within 30 days. */
export const BOARD_BY_TYPE = [
  { label: "Poste apagado", days: 12, within: 78 },
  { label: "Sinalização e semáforo", days: 16, within: 70 },
  { label: "Lixo e descarte irregular", days: 19, within: 64 },
  { label: "Boca de lobo entupida", days: 27, within: 52 },
  { label: "Árvore: poda ou risco", days: 34, within: 41 },
  { label: "Buraco na rua", days: 41, within: 33 },
  { label: "Rua que alaga toda chuva", days: 58, within: 18 },
];

export const BOARD_BY_AGENCY = [
  { agency: "Secretaria de Obras e Reconstrução", types: "Buraco, alagamento, boca de lobo" },
  { agency: "Secretaria de Serviços e Zeladoria Urbana", types: "Lixo, entulho, árvores" },
  { agency: "Iluminação pública", types: "Poste apagado" },
  { agency: "Secretaria de Mobilidade Urbana", types: "Sinalização e semáforo" },
];

/* ---------- Ouvidoria 2024 (Relatório Anual da Ouvidoria 2024; see the footnotes) ---------- */

export const OUVIDORIA_CHANNELS = [
  { label: "E-mail", n: 1470 },
  { label: "Fala.BR", n: 1087 },
  { label: "Telefone", n: 189 },
  { label: "Presencial", n: 26 },
];
export const OUVIDORIA_TOTAL = 2772;

export type FloodKey = "in-time" | "late" | "open-late" | "open";
export const FLOOD_PERIOD: { key: FloodKey; label: string; pct: number }[] = [
  { key: "in-time", label: "Respondidas em até 30 dias", pct: 53.7 },
  { key: "late", label: "Respondidas fora do prazo", pct: 26.1 },
  { key: "open-late", label: "Em aberto e atrasadas", pct: 12.4 },
  { key: "open", label: "Em aberto, no prazo", pct: 7.8 },
];

export const pct = (n: number) => `${String(n).replace(".", ",")}%`;
