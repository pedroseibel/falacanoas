import { floodLines } from "./flooding";
import { localTime, MONTHS_FULL_PT } from "./format";
import { rainLine } from "./rain";
import type { Item, Municipality } from "./types";

/**
 * The daily digest to the Ouvidoria (DECISIONS round 5): in the Fala's own name, the CAC in copy,
 * one entry per new report, grouped by the body responsible. Sending it starts each report's public
 * clock. It carries what the map already shows (text, place, photos, confirmations), never who
 * reported (the privacy notice promises the Prefeitura gets reports "sem quem os fez"), and never
 * demo data.
 *
 * One document, two renderings: the e-mail's plain text (which stands alone) and the PDF attached to
 * it (apps/digest). Both come from digestDocument, so they can't disagree.
 */

export interface DigestItem extends Item {
  /** When it was published (ISO). */
  createdAt?: string;
}

export interface DigestEntry {
  /** Its number in this resumo, continuous across the bodies: "item 12" holds up on a phone call. */
  n: number;
  id: string;
  category: string;
  /** The category's key in the instance ("buraco"): which pictogram the PDF sets beside it. */
  categoryKey: string;
  bairro: string | null;
  title: string;
  /** The resident's text, when it says more than the title. */
  text: string | null;
  /** A named place the resident chose ("Posto de saúde do bairro"). */
  place: string | null;
  /** Street and number looked up from the point when it was registered: approximate. */
  address: string | null;
  /** The resident's ponto de referência ("em frente à escola"). */
  reference: string | null;
  /** On a street that floods, what the resident saw (core flooding.ts), one line each. */
  water: { term: string; value: string }[];
  /** On a street that floods, the day's rain at the nearest gauge, with its source (core rain.ts). */
  rain: { line: string; source: string } | null;
  point: { lat: number; lng: number } | null;
  /** "12/10 às 14:20", local time. */
  registered: string | null;
  confirmations: number;
  /** Absolute addresses of the approved photos. */
  photos: string[];
  /** The report's public page. */
  url: string;
}

export interface DigestSection {
  agency: string;
  entries: DigestEntry[];
}

export interface DigestDocument {
  /** "0287/2026": the year's sequence, as an ofício is numbered. */
  number: string;
  /** "Canoas, 13 de outubro de 2026." */
  dateLine: string;
  /** "13/10/2026" */
  day: string;
  /** "13/10/2026 às 18:00" */
  sentAt: string;
  sender: string;
  site: string;
  municipality: string;
  deadlineDays: number;
  total: number;
  sections: DigestSection[];
}

export interface Digest {
  subject: string;
  text: string;
  itemIds: string[];
  document: DigestDocument;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "12/10 às 14:20", in the instance's time zone. */
const when = (iso: string, timezone: string) => {
  const t = localTime(new Date(iso), timezone);
  return `${pad(t.day)}/${pad(t.month)} às ${pad(t.hour)}:${pad(t.minute)}`;
};

/** The bucket for a category the instance doesn't route anywhere: last, so it stands out. */
export const NO_AGENCY = "Sem órgão definido pelo Fala";

function pointOf(it: Item): { lng: number; lat: number } | null {
  const s = it.scope;
  if (s.type === "point") return { lng: s.lng, lat: s.lat };
  if (s.type === "place" && s.lng !== undefined && s.lat !== undefined) return { lng: s.lng, lat: s.lat };
  return null;
}

const absolute = (site: string, src: string) => (/^https?:\/\//.test(src) ? src : `${site}${src}`);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** An OpenStreetMap link centred on the point: opens anywhere, no account, no app. */
export const osmLink = (p: { lat: number; lng: number }) => {
  const lat = p.lat.toFixed(5);
  const lng = p.lng.toFixed(5);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
};

/** Which digests an item belongs in: published, real, an occurrence, and not sent yet. */
export const digestible = (it: DigestItem & { sentAt?: string | null }) =>
  !it.demo && !it.moderation && it.kind === "occurrence" && !it.sentAt;

/**
 * The resumo's content. Bodies in alphabetical order (the unrouted bucket last); inside each, by
 * bairro and then by time, so a crew's list reads by area; numbers run on across bodies.
 */
export function digestDocument(
  items: DigestItem[],
  muni: Municipality,
  sentAt: Date,
  sequence: number,
): DigestDocument {
  const site = `https://${muni.branding.domain}`;
  const t = localTime(sentAt, muni.timezone);
  const real = items.filter((it) => !it.demo && !it.moderation);
  const agencyOf = (it: Item) => muni.categories.find((c) => c.key === it.category)?.agency ?? NO_AGENCY;
  const bairroOf = (it: Item) => muni.neighborhoods.find((b) => b.slug === it.neighborhood)?.name ?? null;

  const groups = new Map<string, DigestItem[]>();
  for (const it of real) groups.set(agencyOf(it), [...(groups.get(agencyOf(it)) ?? []), it]);
  const order = [...groups.keys()].toSorted((a, b) =>
    a === NO_AGENCY ? 1 : b === NO_AGENCY ? -1 : a.localeCompare(b, "pt-BR"),
  );

  let n = 0;
  const sections = order.map((agency) => ({
    agency,
    entries: (groups.get(agency) ?? [])
      .toSorted(
        (a, b) =>
          (bairroOf(a) ?? "~").localeCompare(bairroOf(b) ?? "~", "pt-BR") ||
          (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
      )
      .map((it): DigestEntry => {
        n += 1;
        return {
          n,
          id: it.id,
          category: muni.categories.find((c) => c.key === it.category)?.label ?? it.category,
          categoryKey: it.category,
          bairro: bairroOf(it),
          title: it.title,
          text: it.text && it.text !== it.title ? it.text : null,
          place: it.scope.type === "place" ? it.scope.label : null,
          address: it.address ?? null,
          reference: it.reference ?? null,
          water: it.flooding ? floodLines(it.flooding) : [],
          rain: it.rain ? rainLine(it.rain, muni.timezone) : null,
          point: pointOf(it),
          registered: it.createdAt ? when(it.createdAt, muni.timezone) : null,
          confirmations: it.confirmations,
          photos: it.photos.map((p) => absolute(site, p.src)),
          url: `${site}/o/${it.id}`,
        };
      }),
  }));

  return {
    number: `${String(sequence).padStart(4, "0")}/${t.year}`,
    dateLine: `${muni.name}, ${t.day === 1 ? "1º" : t.day} de ${MONTHS_FULL_PT[t.month - 1]} de ${t.year}.`,
    day: `${pad(t.day)}/${pad(t.month)}/${t.year}`,
    sentAt: `${pad(t.day)}/${pad(t.month)}/${t.year} às ${pad(t.hour)}:${pad(t.minute)}`,
    sender: muni.branding.name,
    site,
    municipality: muni.name,
    deadlineDays: muni.deadlineDays,
    total: n,
    sections,
  };
}

/** The e-mail. Plain text that stands alone; the PDF, when attached, is the same resumo laid out. */
export function digestText(doc: DigestDocument, { attachment }: { attachment: boolean }): string {
  const lines: string[] = [
    `Resumo diário nº ${doc.number}`,
    doc.dateLine,
    "",
    `Este é o resumo diário do ${doc.sender}, um mapa independente e de código aberto onde moradores de ${doc.municipality} registram problemas urbanos. Ele não é um canal da Prefeitura.`,
    "",
    `Hoje: ${plural(doc.total, "registro novo", "registros novos")}, para ${plural(doc.sections.length, "órgão", "órgãos")}.`,
    ...doc.sections.map((s) => {
      const ns = s.entries.map((e) => e.n);
      const range = ns.length === 1 ? `nº ${ns[0]}` : `nº ${ns[0]} a ${ns.at(-1)}`;
      return `- ${s.agency}: ${plural(s.entries.length, "registro", "registros")} (${range})`;
    }),
    "",
    ...(attachment
      ? [
          "Em anexo, o mesmo resumo em PDF: uma seção por órgão, que pode ser encaminhada como está, com as fotos e o mapa de cada registro.",
          "",
        ]
      : []),
    "Cada registro abaixo tem um código e uma página pública, com as fotos, o lugar e o histórico. Pedimos que cada um seja protocolado. O número do protocolo pode vir em resposta a este e-mail, citando o código do registro, e passa a aparecer na página do registro.",
    "",
    "Quem registrou não é identificado neste resumo.",
  ];
  for (const s of doc.sections) {
    lines.push("", "", `${s.agency} · ${plural(s.entries.length, "registro", "registros")}`);
    for (const e of s.entries)
      lines.push(
        "",
        `${e.n}. ${e.category}${e.bairro ? ` · ${e.bairro}` : ""} · código ${e.id}`,
        `   ${e.title}`,
        ...(e.text ? [`   “${e.text}”`] : []),
        ...(e.place ? [`   Lugar: ${e.place}`] : []),
        ...(e.address ? [`   Endereço aproximado: ${e.address}`] : []),
        ...(e.reference ? [`   Ponto de referência: ${e.reference}`] : []),
        ...(e.water.length
          ? [`   Segundo quem registrou: ${e.water.map((w) => `${w.term.toLowerCase()}: ${w.value}`).join("; ")}.`]
          : []),
        ...(e.rain ? [`   Chuva: ${e.rain.line} Fonte: ${e.rain.source}`] : []),
        ...(e.point ? [`   Local: ${e.point.lat.toFixed(5)}, ${e.point.lng.toFixed(5)} · ${osmLink(e.point)}`] : []),
        ...e.photos.map((src, i) => `   Foto ${i + 1}: ${src}`),
        `   ${[
          e.registered ? `Registrado em ${e.registered}` : null,
          e.confirmations > 0 ? plural(e.confirmations, "vizinho confirmou", "vizinhos confirmaram") : null,
        ]
          .filter(Boolean)
          .join(" · ")}`.trimEnd(),
        `   ${e.url}`,
      );
  }
  lines.push(
    "",
    "",
    `${doc.sender} · ${doc.site}`,
    `Os dias de cada registro passam a contar a partir deste envio. Prazo de referência: ${doc.deadlineDays} dias (Lei 13.460/2017, art. 16).`,
  );
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

export function buildDigest(
  items: DigestItem[],
  muni: Municipality,
  sentAt: Date,
  { sequence = 1, attachment = false }: { sequence?: number; attachment?: boolean } = {},
): Digest {
  const document = digestDocument(items, muni, sentAt, sequence);
  return {
    subject: `${document.sender} · Resumo diário nº ${document.number} · ${document.day} · ${plural(document.total, "registro", "registros")}`,
    text: digestText(document, { attachment }),
    itemIds: document.sections.flatMap((s) => s.entries.map((e) => e.id)),
    document,
  };
}
