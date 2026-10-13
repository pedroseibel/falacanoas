import { isOpen, outlineOf, type BairroCard, type Item, type ItemCard, type Scope, type ShareCard } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { findItem, listItems } from "./items";
import { getPhoto } from "./photos";

/**
 * The data behind each share card (DECISIONS rounds 11 and 15), read here and drawn by the cards
 * Worker. Plain server helpers: only the /api/cartao routes import this module. Only published items
 * get a card; a pin in moderation, or refused, has none.
 */

const host = canoas.branding.domain;

/** The first photo's bytes as a data URL: from Storage for uploads, from the site for the demo's. */
async function photoOf(it: Item, origin: string): Promise<string | null> {
  const src = it.photos[0]?.src;
  if (!src) return null;
  const key = src.startsWith("/api/fotos/") ? src.slice("/api/fotos/".length) : null;
  const res = key ? await getPhoto(key) : await fetch(new URL(src, origin)).catch(() => null);
  if (!res?.ok) return null;
  const type = res.headers.get("content-type")?.split(";")[0] ?? (src.endsWith(".webp") ? "image/webp" : "image/jpeg");
  const body = new Uint8Array(await res.arrayBuffer());
  // Large originals stay out of the card: the preview falls back to the outline.
  return body.length <= 2_500_000 ? `data:${type};base64,${Buffer.from(body).toString("base64")}` : null;
}

/** Where the dot goes: a point, or a place with coordinates. */
function pointOf(scope: Scope): { lng: number; lat: number } | null {
  if (scope.type === "point") return { lng: scope.lng, lat: scope.lat };
  if (scope.type === "place" && scope.lng !== undefined && scope.lat !== undefined)
    return { lng: scope.lng, lat: scope.lat };
  return null;
}

const feature = (slug: string | null) => canoas.geo.neighborhoods.features.find((f) => f.properties.slug === slug);

/** A pin's card, and what to show instead if it can't be drawn: its photo, or og.png. */
export async function itemShareCard(
  id: string,
  origin: string,
  now = new Date(),
): Promise<{ card: ItemCard; fallback: string } | null> {
  const it = await findItem(id.toUpperCase(), now);
  if (!it || it.moderation) return null;
  const bairro = feature(it.neighborhood ?? null);
  const card: ItemCard = {
    kind: "item",
    title: it.title,
    category: canoas.categories.find((c) => c.key === it.category)?.label ?? it.category,
    place: canoas.neighborhoods.find((n) => n.slug === it.neighborhood)?.name ?? null,
    days: it.days,
    open: isOpen(it),
    demo: Boolean(it.demo),
    photo: await photoOf(it, origin),
    outline: bairro ? outlineOf(bairro, 400, pointOf(it.scope)) : null,
    link: `${host}/o/${it.id}`,
  };
  return { card, fallback: it.photos[0]?.src ?? "/og.png" };
}

/** A bairro's open occurrences and how many are past the deadline, as on its page. */
export async function bairroShareCard(
  slug: string,
  now = new Date(),
): Promise<{ card: BairroCard; fallback: string } | null> {
  const bairro = canoas.neighborhoods.find((n) => n.slug === slug);
  if (!bairro) return null;
  const mine = (await listItems(now)).filter((i) => i.neighborhood === slug && i.kind === "occurrence");
  const open = mine.filter(isOpen);
  const f = feature(slug);
  const card: BairroCard = {
    kind: "bairro",
    name: bairro.name,
    open: open.length,
    overdue: open.filter((i) => i.days > canoas.deadlineDays).length,
    deadlineDays: canoas.deadlineDays,
    demo: mine.some((i) => i.demo),
    outline: f ? outlineOf(f) : null,
    link: `${host}/bairro/${slug}`,
  };
  return { card, fallback: "/og.png" };
}

/**
 * The card's PNG, cached under its full URL (the link's `v` changes with the numbers, so a card is
 * drawn once per state). If drawing fails, as on a plan without the CPU time for it, the preview
 * still gets an image: `fallback` (the pin's photo, or og.png).
 */
export async function cardResponse(
  request: Request,
  describe: () => Promise<{ card: ShareCard; fallback: string } | null>,
  render: ((card: ShareCard) => Promise<Uint8Array>) | null,
): Promise<Response> {
  const cache = await caches.open("cartoes").catch(() => null);
  const hit = await cache?.match(request);
  if (hit) return hit;
  const described = await describe();
  if (!described) return new Response("Não encontrado.", { status: 404 });
  const { card, fallback } = described;
  let failure: unknown = render ? null : new Error("sem o Worker de cartões (CARDS)");
  const png = render
    ? await render(card).catch((e: unknown) => {
        console.error("cartão: não deu para desenhar", e);
        failure = e;
        return null;
      })
    : null;
  // In development, say why; in production, the preview still gets an image.
  if (!png && import.meta.env.DEV) return new Response(`Cartão não desenhado: ${String(failure)}`, { status: 500 });
  if (!png) return Response.redirect(new URL(fallback, request.url).toString(), 302);
  const res = new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
  await cache?.put(request, res.clone()).catch(() => undefined);
  return res;
}
