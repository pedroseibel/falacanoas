import { daysLabel, isOpen, SHARE_CARD_SIZE, type Item, type Municipality } from "@fala/core";

/**
 * What a shared link shows (DECISIONS rounds 11 and 15): Open Graph and Twitter tags pointing at the
 * generated card. Absolute URLs, since crawlers read them out of context. The card's link carries a
 * version that changes with what it shows, so a cached card is never stale.
 */

type Meta = { title: string } | { name: string; content: string } | { property: string; content: string };

const site = (muni: Municipality) => `https://${muni.branding.domain}`;

function common(muni: Municipality, url: string, image: string, alt: string): Meta[] {
  return [
    { property: "og:site_name", content: muni.branding.name },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: String(SHARE_CARD_SIZE.width) },
    { property: "og:image:height", content: String(SHARE_CARD_SIZE.height) },
    { property: "og:image:alt", content: alt },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

/** "43 dias em aberto", "resolvido em 22 dias". */
export const clockText = (it: Item) =>
  isOpen(it) ? `${it.days} ${daysLabel(it.days)} em aberto` : `resolvido em ${it.days} ${daysLabel(it.days)}`;

export function itemShareMeta(it: Item, muni: Municipality): { meta: Meta[]; links: { rel: string; href: string }[] } {
  const url = `${site(muni)}/o/${it.id}`;
  const version = `${it.days}${isOpen(it) ? "a" : "r"}${it.photos.length}`;
  const category = muni.categories.find((c) => c.key === it.category)?.label ?? it.category;
  const place = muni.neighborhoods.find((n) => n.slug === it.neighborhood)?.name;
  const where = place ? `${category} · ${place}` : category;
  const demo = it.demo ? "Exemplo, dados fictícios. " : "";
  return {
    meta: [
      { title: `${it.title} · ${muni.branding.name}` },
      { name: "description", content: `${demo}${clockText(it)}. ${it.text}`.trim() },
      { property: "og:type", content: "article" },
      { property: "og:title", content: `${it.title} · ${clockText(it)}` },
      { property: "og:description", content: `${demo}${where}. ${it.text}`.trim() },
      ...common(
        muni,
        url,
        `${site(muni)}/api/cartao/o/${it.id}?v=${version}`,
        `${it.title}: ${clockText(it)}. ${where}.`,
      ),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export interface BairroCounts {
  name: string;
  slug: string;
  open: number;
  overdue: number;
  demo: boolean;
}

export function bairroShareMeta(b: BairroCounts, muni: Municipality) {
  const url = `${site(muni)}/bairro/${b.slug}`;
  const counts = `${b.open} ${b.open === 1 ? "registro aberto" : "registros abertos"}${
    b.overdue ? `, ${b.overdue} há mais de ${muni.deadlineDays} dias` : ""
  }`;
  const demo = b.demo ? "Exemplo, dados fictícios. " : "";
  return {
    meta: [
      { title: `${b.name} · ${muni.branding.name}` },
      { name: "description", content: `${demo}${b.name}: ${counts}. O que está quebrado no bairro, contado em dias.` },
      { property: "og:type", content: "website" },
      { property: "og:title", content: `${b.name}: ${counts}` },
      { property: "og:description", content: `${demo}O que está quebrado no bairro, contado em dias.` },
      ...common(
        muni,
        url,
        `${site(muni)}/api/cartao/bairro/${b.slug}?v=${b.open}-${b.overdue}`,
        `${b.name}: ${counts}.`,
      ),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
