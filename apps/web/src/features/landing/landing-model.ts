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
