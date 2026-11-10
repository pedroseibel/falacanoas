import { osmLink, type DigestDocument, type DigestEntry } from "@fala/core";
import type { MarkerOut } from "./markers";

/**
 * What the Typst template reads (data.json): the resumo's content, the sentences it prints, and where
 * each map, photo and QR code was written. The wording lives here, tested; the template only lays
 * it out. Pure.
 */

export interface MapAsset {
  /** Path inside the build folder. */
  svg: string;
  /** Width over height. */
  aspect: number;
  markers: { n: number; x: number; y: number; lx: number; ly: number; moved: boolean }[];
  /** Discs with each report's number; false past the limit, where markers are plain dots. */
  numbered: boolean;
  labels: { name: string; x: number; y: number; angle: number }[];
  scale: { label: string; fraction: number };
}

export interface EntryAssets {
  locator: MapAsset | null;
  street: { name: string; metres: number } | null;
  qr: string;
  /** The category's pictogram, copied into the build folder; null when the category has none. */
  icon: string | null;
  photos: { file: string; alt: string }[];
  /** Photos the resumo lists but couldn't fetch: the page says how many, and where to see them. */
  missingPhotos: number;
}

export interface Addressee {
  to: string;
  cc: string[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A scale bar about a fifth of the map wide, in a round length. */
export function scaleBar(widthMetres: number, target = 0.2): { label: string; fraction: number } {
  const steps = [25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000];
  const want = widthMetres * target;
  const m = steps.reduce((best, s) => (Math.abs(s - want) < Math.abs(best - want) ? s : best));
  return { label: m >= 1000 ? `${m / 1000} km` : `${m} m`, fraction: m / widthMetres };
}

export const markerFractions = (placed: MarkerOut[], width: number, height: number): MapAsset["markers"] =>
  placed.map((m) => ({
    n: m.n,
    x: m.at[0] / width,
    y: m.at[1] / height,
    lx: m.label[0] / width,
    ly: m.label[1] / height,
    moved: m.moved,
  }));

const range = (entries: DigestEntry[]) => {
  const first = entries[0]?.n ?? 0;
  const last = entries.at(-1)?.n ?? first;
  return first === last ? `nº ${first}` : `nº ${first} a ${last}`;
};

const bairrosIn = (entries: DigestEntry[]) => new Set(entries.map((e) => e.bairro).filter(Boolean)).size;

/** A body's name without "Secretaria de", for the head of its pages. */
const shortAgency = (agency: string) => agency.replace(/^Secretaria (Municipal )?(de|da|do|das|dos) /, "");

export function templateData(
  doc: DigestDocument,
  assets: { overview: MapAsset | null; sections: (MapAsset | null)[]; entries: Map<string, EntryAssets> },
  opts: { addressee: Addressee; sample: boolean },
) {
  const all = doc.sections.flatMap((s) => s.entries);
  const withPhotos = all.filter((e) => (assets.entries.get(e.id)?.photos.length ?? 0) > 0).length;
  const example = all[0]?.id ?? "AB3K2";
  const host = new URL(doc.site).host;
  return {
    meta: {
      number: doc.number,
      dateLine: doc.dateLine,
      /** "13 de outubro de 2026, às 18:00": the cover's date, beside the municipality's name. */
      dateLong: `${doc.dateLine.replace(`${doc.municipality}, `, "").replace(/\.$/, "")}, às ${doc.sentAt.split(" às ")[1] ?? ""}`,
      municipality: doc.municipality,
      day: doc.day,
      sentAt: doc.sentAt,
      sender: doc.sender,
      site: doc.site,
      host,
      title: `Resumo diário nº ${doc.number} · ${doc.sender}`,
      sample: opts.sample,
      addressee: opts.addressee,
      subject: `Registros de moradores de ${doc.day}.`,
      headline: `${doc.total === 1 ? "Hoje, 1 registro novo" : `Hoje, ${doc.total} registros novos`} de moradores de ${doc.municipality}, para ${plural(doc.sections.length, "órgão", "órgãos")}.`,
      lede: "Cada registro tem um código, o lugar, as fotos aprovadas pela moderação e uma página pública com o histórico. Pedimos que cada um seja protocolado e encaminhado ao órgão responsável.",
      stats: [
        { value: String(doc.total), label: doc.total === 1 ? "registro" : "registros" },
        { value: String(doc.sections.length), label: doc.sections.length === 1 ? "órgão" : "órgãos" },
        { value: String(bairrosIn(all)), label: bairrosIn(all) === 1 ? "bairro" : "bairros" },
        { value: String(withPhotos), label: "com fotos" },
      ],
      answer: `Responda a este e-mail com o número de protocolo de cada registro, citando o código (por exemplo: ${example}, protocolo 2026/000000). Um protocolo para o resumo inteiro também serve: diga quais códigos ele cobre. O número passa a aparecer na página pública do registro.`,
      clock: `Os dias de cada registro passam a contar a partir deste envio, em ${doc.sentAt}. A Lei 13.460/2017 (art. 16) prevê resposta ao usuário em até ${doc.deadlineDays} dias.`,
      privacy: "Quem registrou não é identificado neste resumo. As fotos passaram pela moderação antes de entrar.",
      independent: `O ${doc.sender} é um mapa independente e de código aberto. Não é um canal da Prefeitura.`,
      attribution:
        "Mapas: OpenFreeMap · © OpenMapTiles · © colaboradores do OpenStreetMap, sob a licença ODbL (openstreetmap.org/copyright).",
      overviewCaption:
        assets.overview?.numbered && assets.overview.markers.length
          ? "Cada número é um registro deste resumo, na ordem das páginas seguintes."
          : "Os registros deste resumo. Os números estão nos mapas de cada órgão.",
    },
    overview: assets.overview,
    summary: doc.sections.map((s, i) => ({
      key: `s${i}`,
      agency: s.agency,
      count: s.entries.length,
      range: range(s.entries),
      codes: s.entries.map((e) => e.id).join(", "),
    })),
    sections: doc.sections.map((s, i) => ({
      key: `s${i}`,
      agency: s.agency,
      short: shortAgency(s.agency),
      line: [
        plural(s.entries.length, "registro", "registros"),
        range(s.entries),
        bairrosIn(s.entries) ? plural(bairrosIn(s.entries), "bairro", "bairros") : null,
      ]
        .filter(Boolean)
        .join(" · "),
      map: assets.sections[i] ?? null,
      entries: s.entries.map((e) => {
        const a = assets.entries.get(e.id);
        const photos = a?.photos ?? [];
        return {
          n: e.n,
          id: e.id,
          category: e.category,
          bairro: e.bairro ?? "Bairro não identificado",
          title: e.title,
          text: e.text,
          place: e.place,
          address: e.address ? `${e.address} (aproximado)` : null,
          reference: e.reference,
          // A street that floods: what the resident saw, and the day's rain at the nearest gauge.
          water: e.water.length ? `${e.water.map((w) => `${w.term.toLowerCase()}: ${w.value}`).join("; ")}.` : null,
          rain: e.rain,
          history: e.history,
          coords: e.point ? `${e.point.lat.toFixed(5)}, ${e.point.lng.toFixed(5)}` : null,
          // The street read from the map data, when no address was looked up.
          street: !e.address && a?.street ? `${a.street.name} (a ${a.street.metres} m)` : null,
          registered: e.registered,
          confirms: e.confirmations,
          confirmations:
            e.confirmations > 0
              ? plural(e.confirmations, "vizinho confirmou", "vizinhos confirmaram")
              : "Nenhuma confirmação ainda",
          // Shown photos speak for themselves; say so only when there are none, or some are missing.
          photosLine: !e.photos.length
            ? "Sem foto"
            : a?.missingPhotos
              ? `${a.missingPhotos} de ${plural(e.photos.length, "foto", "fotos")} ${a.missingPhotos === 1 ? "não entrou" : "não entraram"} aqui; todas estão na página pública`
              : null,
          url: e.url,
          urlLabel: e.url.replace(/^https?:\/\//, ""),
          osm: e.point ? osmLink(e.point) : null,
          qr: a?.qr ?? null,
          icon: a?.icon ?? null,
          qrAlt: `Código QR que abre a página pública do registro ${e.id}`,
          locator: a?.locator ?? null,
          locatorAlt: e.point
            ? `Mapa das ruas em volta do registro ${e.id}, com o local marcado no centro${a?.street ? `; via mais próxima: ${a.street.name}` : ""}`
            : "",
          photos,
        };
      }),
    })),
  };
}
