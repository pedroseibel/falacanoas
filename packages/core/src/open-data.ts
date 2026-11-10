import { calendarDays } from "./format";
import { bairroName, itemUrl } from "./logic";
import type { Municipality } from "./types";

/**
 * Open data (DECISIONS round 10): the pins and their status timelines, for anyone to reuse under the
 * instance's licence. The database views (`dados.registros`, `dados.historico`) already leave out
 * authors, residents' words, photos and exact points; this adds the names from the instance and the
 * days on the public clock, and writes JSON, GeoJSON and CSV.
 */

export type OpenDataLicence = "CC-BY-4.0" | "ODbL-1.0";

export const OPEN_DATA_LICENCES: Record<OpenDataLicence, { name: string; url: string }> = {
  "CC-BY-4.0": {
    name: "Creative Commons Atribuição 4.0 Internacional (CC BY 4.0)",
    url: "https://creativecommons.org/licenses/by/4.0/deed.pt-br",
  },
  "ODbL-1.0": {
    name: "Open Database License (ODbL) 1.0",
    url: "https://opendatacommons.org/licenses/odbl/1-0/",
  },
};

/** A row of `dados.registros`. */
export interface OpenRow {
  codigo: string;
  tipo: string;
  categoria: string;
  bairro: string | null;
  lng: number | null;
  lat: number | null;
  registrado_em: Date;
  enviado_em: Date | null;
  protocolo: string | null;
  protocolado_em: Date | null;
  estado_comunidade: string;
  estado_orgao: string | null;
  orgao_que_respondeu: string | null;
  orgao_atualizou_em: Date | null;
  fechado_em: Date | null;
  confirmacoes: number;
  atualizado_em: Date;
}

/** A row of `dados.historico`. */
export interface OpenEventRow {
  codigo: string;
  em: Date;
  ordem: number;
  evento: string;
  quem: string | null;
  texto: string | null;
}

export interface OpenRecord {
  codigo: string;
  tipo: string;
  categoria: string;
  categoria_nome: string;
  orgao_responsavel: string | null;
  bairro: string | null;
  bairro_nome: string | null;
  lng: number | null;
  lat: number | null;
  registrado_em: string;
  enviado_em: string | null;
  dias: number;
  protocolo: string | null;
  protocolado_em: string | null;
  estado_comunidade: string;
  estado_orgao: string | null;
  orgao_que_respondeu: string | null;
  orgao_atualizou_em: string | null;
  fechado_em: string | null;
  confirmacoes: number;
  atualizado_em: string;
  pagina: string;
}

export interface OpenEvent {
  codigo: string;
  em: string;
  evento: string;
  quem: string | null;
  texto: string | null;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function openRecord(row: OpenRow, muni: Municipality, now: Date): OpenRecord {
  const category = muni.categories.find((c) => c.key === row.categoria);
  return {
    codigo: row.codigo,
    tipo: row.tipo,
    categoria: row.categoria,
    categoria_nome: category?.label ?? row.categoria,
    orgao_responsavel: category?.agency ?? null,
    bairro: row.bairro,
    bairro_nome: bairroName(muni, row.bairro),
    lng: row.lng,
    lat: row.lat,
    registrado_em: row.registrado_em.toISOString(),
    enviado_em: iso(row.enviado_em),
    // The public clock: from the send to the Prefeitura until neighbours confirm the fix.
    dias: row.enviado_em ? Math.max(0, calendarDays(row.enviado_em, row.fechado_em ?? now, muni.timezone)) : 0,
    protocolo: row.protocolo,
    protocolado_em: iso(row.protocolado_em),
    estado_comunidade: row.estado_comunidade,
    estado_orgao: row.estado_orgao,
    orgao_que_respondeu: row.orgao_que_respondeu,
    orgao_atualizou_em: iso(row.orgao_atualizou_em),
    fechado_em: iso(row.fechado_em),
    confirmacoes: row.confirmacoes,
    atualizado_em: row.atualizado_em.toISOString(),
    pagina: itemUrl(muni, row.codigo),
  };
}

export const openEvent = (row: OpenEventRow): OpenEvent => ({
  codigo: row.codigo,
  em: row.em.toISOString(),
  evento: row.evento,
  quem: row.quem,
  texto: row.texto,
});

export interface OpenFeatureCollection {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    id: string;
    geometry: { type: "Point"; coordinates: [number, number] } | null;
    properties: Omit<OpenRecord, "lng" | "lat">;
  }[];
}

/** GeoJSON (RFC 7946). Pins without a point (a whole bairro or the city) go with a null geometry. */
export function toFeatureCollection(records: OpenRecord[]): OpenFeatureCollection {
  return {
    type: "FeatureCollection",
    features: records.map(({ lng, lat, ...properties }) => ({
      type: "Feature",
      id: properties.codigo,
      geometry: lng !== null && lat !== null ? { type: "Point", coordinates: [lng, lat] } : null,
      properties,
    })),
  };
}

/**
 * One CSV field (RFC 4180). Text starting with =, +, -, @ or a tab is a formula to a spreadsheet, so
 * it gets a leading apostrophe (OWASP's CSV injection advice); numbers and dates are left as they are.
 */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const csvLine = (cells: unknown[]) => cells.map(csvField).join(",");

/** CSV with a header line and CRLF line ends, the columns in the given order. */
export function toCsv<T extends object>(rows: T[], columns: readonly (keyof T & string)[]): string {
  return [csvLine([...columns]), ...rows.map((r) => csvLine(columns.map((c) => r[c])))].join("\r\n") + "\r\n";
}

export const RECORD_COLUMNS: readonly (keyof OpenRecord)[] = [
  "codigo",
  "tipo",
  "categoria",
  "categoria_nome",
  "orgao_responsavel",
  "bairro",
  "bairro_nome",
  "lng",
  "lat",
  "registrado_em",
  "enviado_em",
  "dias",
  "protocolo",
  "protocolado_em",
  "estado_comunidade",
  "estado_orgao",
  "orgao_que_respondeu",
  "orgao_atualizou_em",
  "fechado_em",
  "confirmacoes",
  "atualizado_em",
  "pagina",
];

export const EVENT_COLUMNS: readonly (keyof OpenEvent)[] = ["codigo", "em", "evento", "quem", "texto"];

export const OPEN_DATA_DICTIONARY = {
  registros: {
    codigo: "Código público do registro, o mesmo da página (/o/<código>).",
    tipo: "occurrence (problema na rua) ou public_issue (questão pública).",
    categoria: "Chave da categoria; categoria_nome é o nome mostrado no mapa.",
    orgao_responsavel: "O órgão da Prefeitura que o Fala associa à categoria.",
    bairro: "Bairro oficial (chave); bairro_nome é o nome. Vazio quando o registro vale para a cidade toda.",
    "lng, lat":
      "O ponto, levado ao centro de uma célula de 0,001° (cerca de 100 m). Vazio quando o registro é de um bairro ou da cidade.",
    registrado_em: "Quando o registro foi publicado (ISO 8601, UTC).",
    enviado_em: "Quando o resumo diário o levou à Prefeitura. O relógio público começa aqui.",
    dias: "Dias no relógio público: do envio até os vizinhos confirmarem o conserto (ou até hoje).",
    "protocolo, protocolado_em": "O protocolo que a Ouvidoria deu, quando deu.",
    estado_comunidade:
      "reported (aguardando confirmação), confirmed (vizinhos confirmaram), ongoing (dizem que continua), apparently_resolved (parece resolvido), resolved (resolvido e confirmado pelos vizinhos).",
    estado_orgao:
      "O que o órgão público disse: acknowledged, under_review, scheduled, in_progress ou resolved. Vazio se nada disse.",
    "orgao_que_respondeu, orgao_atualizou_em": "Quem respondeu pelo poder público, e quando.",
    fechado_em: "Quando os vizinhos confirmaram o conserto.",
    confirmacoes: "Vizinhos que confirmaram o problema.",
    atualizado_em: "A última mudança no registro.",
    pagina: "A página pública, com o texto, as fotos e o histórico completo.",
  },
  historico: {
    evento:
      "created, sent_to_authority, confirmed, update_added, photo_added, official_response, official_status_changed, community_resolved, reopened, merged ou moderation.",
    quem: "Só para o envio à Prefeitura e para o poder público: o nome do projeto ou do órgão. Moradores não são nomeados.",
    texto: "Só as palavras do poder público e do projeto. O que os moradores escrevem está na página do registro.",
  },
  fora: [
    "Quem registrou, confirmou ou comentou: nem apelido, nem conta, nem contato.",
    "Os textos escritos pelos moradores, que podem citar outras pessoas.",
    "Fotos, até que rostos e placas sejam borrados automaticamente.",
    "O ponto exato.",
    "Registros de exemplo e registros que a moderação não publicou.",
  ],
};
