import { localTime } from "./format";
import type { Item, Municipality } from "./types";

/**
 * The daily digest to the Ouvidoria (DECISIONS round 5): in the Fala's own name, the CAC in copy,
 * one entry per new report, grouped by the body responsible. Sending it starts each report's public
 * clock. It carries what the map already shows (text, place, photos, confirmations), never who
 * reported (the privacy notice promises the Prefeitura gets reports "sem quem os fez"), and never
 * demo data.
 */

export interface DigestItem extends Item {
  /** When it was published (ISO). */
  createdAt?: string;
}

export interface Digest {
  subject: string;
  text: string;
  itemIds: string[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "12/10 às 14:20", in the instance's time zone. */
const when = (iso: string, timezone: string) => {
  const t = localTime(new Date(iso), timezone);
  return `${pad(t.day)}/${pad(t.month)} às ${pad(t.hour)}:${pad(t.minute)}`;
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function pointOf(it: Item): { lng: number; lat: number } | null {
  const s = it.scope;
  if (s.type === "point") return { lng: s.lng, lat: s.lat };
  if (s.type === "place" && s.lng !== undefined && s.lat !== undefined) return { lng: s.lng, lat: s.lat };
  return null;
}

const absolute = (site: string, src: string) => (/^https?:\/\//.test(src) ? src : `${site}${src}`);

/** Which digests an item belongs in: published, real, an occurrence, and not sent yet. */
export const digestible = (it: DigestItem & { sentAt?: string | null }) =>
  !it.demo && !it.moderation && it.kind === "occurrence" && !it.sentAt;

export function buildDigest(items: DigestItem[], muni: Municipality, sentAt: Date): Digest {
  const site = `https://${muni.branding.domain}`;
  const day = localTime(sentAt, muni.timezone);
  const real = items.filter((it) => !it.demo && !it.moderation);
  const count = `${real.length} ${real.length === 1 ? "registro" : "registros"}`;
  const subject = `${muni.branding.name} · resumo de ${day.day} ${MONTHS[day.month - 1]} ${day.year} · ${count}`;

  const agencyOf = (it: Item) =>
    muni.categories.find((c) => c.key === it.category)?.agency ?? "Sem órgão definido pelo Fala";
  const groups = new Map<string, DigestItem[]>();
  for (const it of real) groups.set(agencyOf(it), [...(groups.get(agencyOf(it)) ?? []), it]);

  const lines: string[] = [
    `Este é o resumo diário do ${muni.branding.name}, um mapa independente e de código aberto onde moradores de ${muni.name} registram problemas urbanos. Ele não é um canal da Prefeitura.`,
    "",
    "Cada registro abaixo tem um código e uma página pública, com as fotos, o lugar e o histórico. Pedimos que cada um seja protocolado. O número do protocolo pode vir em resposta a este e-mail, citando o código do registro, e passa a aparecer na página do registro.",
    "",
    "Quem registrou não é identificado neste resumo.",
  ];
  let n = 0;
  for (const [agency, group] of [...groups].toSorted(([a], [b]) => a.localeCompare(b, "pt-BR"))) {
    lines.push("", "", `${agency} · ${group.length} ${group.length === 1 ? "registro" : "registros"}`);
    for (const it of group.toSorted((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""))) {
      n += 1;
      const category = muni.categories.find((c) => c.key === it.category)?.label ?? it.category;
      const bairro = muni.neighborhoods.find((b) => b.slug === it.neighborhood)?.name;
      const at = pointOf(it);
      lines.push(
        "",
        `${n}. ${category}${bairro ? ` · ${bairro}` : ""} · código ${it.id}`,
        `   ${it.title}`,
        ...(it.text && it.text !== it.title ? [`   “${it.text}”`] : []),
        ...(at
          ? [
              `   Local: ${at.lat.toFixed(5)}, ${at.lng.toFixed(5)} · https://www.openstreetmap.org/?mlat=${at.lat.toFixed(5)}&mlon=${at.lng.toFixed(5)}#map=18/${at.lat.toFixed(5)}/${at.lng.toFixed(5)}`,
            ]
          : []),
        ...it.photos.map((p, i) => `   Foto ${i + 1}: ${absolute(site, p.src)}`),
        `   ${[
          it.createdAt ? `Registrado em ${when(it.createdAt, muni.timezone)}` : null,
          it.confirmations > 0
            ? `${it.confirmations} ${it.confirmations === 1 ? "vizinho confirmou" : "vizinhos confirmaram"}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}`.trimEnd(),
        `   ${site}/o/${it.id}`,
      );
    }
  }
  lines.push(
    "",
    "",
    `${muni.branding.name} · ${site}`,
    `Os dias de cada registro passam a contar a partir deste envio. Prazo de referência: ${muni.deadlineDays} dias (Lei 13.460/2017, art. 16).`,
  );
  return { subject, text: `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`, itemIds: real.map((it) => it.id) };
}
