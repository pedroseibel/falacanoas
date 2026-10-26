import { calendarDays, eventStamp, type Item, type ItemEvent } from "@fala/core";
import type { itemEvents, itemPhotos, items } from "./db/schema";

/**
 * Rows ↔ items, without the database: what is stored are instants; what an item carries are the
 * readings of those instants at `now` ("43 dias", "há 38 min", "hoje · 13:42").
 */

export type ItemRow = typeof items.$inferSelect;
export type ItemInsert = typeof items.$inferInsert;
export type EventRow = Pick<typeof itemEvents.$inferSelect, "at" | "kind" | "actor" | "text"> &
  Partial<Pick<typeof itemEvents.$inferSelect, "id" | "hiddenAt">>;
export type EventInsert = typeof itemEvents.$inferInsert;
export type PhotoRow = Pick<typeof itemPhotos.$inferSelect, "src" | "takenAt" | "by" | "credit"> &
  Partial<Pick<typeof itemPhotos.$inferSelect, "id" | "review">>;
export type PhotoInsert = typeof itemPhotos.$inferInsert;

const DAY = 864e5;

/**
 * Days on the public clock: from the digest that carried it (sentAt) to now, or to the day the community closed it.
 * Zero while it waits for its first digest: the clock hasn't started.
 */
export function clockDays(row: Pick<ItemRow, "sentAt" | "closedAt">, now: Date, timezone: string): number {
  if (!row.sentAt) return 0;
  return Math.max(0, calendarDays(row.sentAt, row.closedAt ?? now, timezone));
}

/**
 * Rows to the item everyone reads. Only approved photos show; pending ones are a count ("em análise"),
 * removed ones are gone. An update moderation took down keeps its place in the history, without its words.
 */
export function itemFromRows(
  row: ItemRow,
  { events, photos: allPhotos }: { events?: EventRow[]; photos: PhotoRow[] },
  now: Date,
  timezone: string,
): Item {
  const stamp = (at: Date) => eventStamp(at, now, timezone);
  const photos = allPhotos.filter((p) => (p.review ?? "approved") === "approved");
  const pending = allPhotos.filter((p) => p.review === "pending").length;
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    title: row.title,
    text: row.text,
    ...(row.reference ? { reference: row.reference } : {}),
    ...(row.flooding ? { flooding: row.flooding } : {}),
    address: row.address,
    neighborhood: row.neighborhood,
    scope: row.scope,
    days: clockDays(row, now, timezone),
    updatedMinutesAgo: Math.max(0, Math.floor((now.getTime() - row.updatedAt.getTime()) / 60_000)),
    confirmations: row.confirmations,
    followers: row.followers,
    updates: row.updates,
    photos: photos.map((p) => ({
      ...(p.id ? { id: p.id } : {}),
      src: p.src,
      takenAt: stamp(p.takenAt),
      by: p.by,
      ...(p.credit ? { credit: p.credit } : {}),
    })),
    ...(pending ? { pendingPhotos: pending } : {}),
    visibility: row.visibility,
    author: row.visibility === "anonymous" ? null : row.authorNick,
    community: row.community,
    official:
      row.officialStatus && row.officialAgency && row.officialAt
        ? {
            status: row.officialStatus,
            agency: row.officialAgency,
            daysAgo: Math.max(0, Math.floor((now.getTime() - row.officialAt.getTime()) / DAY)),
          }
        : null,
    ...(row.disagreeing ? { disagreeing: row.disagreeing } : {}),
    sentAt: row.sentAt?.toISOString() ?? null,
    protocol:
      row.protocolNumber && row.protocolAt ? { number: row.protocolNumber, at: row.protocolAt.toISOString() } : null,
    createdAt: row.createdAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    resolvedVotes: row.resolvedVotes,
    resolvingSince: row.resolvingSince?.toISOString() ?? null,
    ...(row.guest ? { guest: true } : {}),
    ...(row.moderation !== "published" ? { moderation: row.moderation } : {}),
    ...(row.demo ? { demo: true } : {}),
    ...(events ? { events: events.map(eventFromRow(stamp)) } : {}),
  };
}

const eventFromRow =
  (stamp: (at: Date) => string) =>
  ({ id, at, kind, actor, text, hiddenAt }: EventRow): ItemEvent => ({
    ...(id ? { id } : {}),
    at: stamp(at),
    kind,
    actor,
    text: hiddenAt ? "" : text,
    ...(hiddenAt ? { removed: true } : {}),
  });

/** Where a photo lives in Storage, from its public path; null for static demo photos. */
export const storageKeyOf = (src: string) => (src.startsWith("/api/fotos/") ? src.slice("/api/fotos/".length) : null);

/**
 * A freshly built item (core's itemFromReport) as rows. Everything in it happened at `now`: one
 * "created" event and the photos it was posted with.
 */
export function rowsForNewItem(
  item: Item,
  now: Date,
  accountId: string | null = null,
): { row: ItemInsert; events: EventInsert[]; photos: PhotoInsert[] } {
  const point = item.scope.type === "point" || item.scope.type === "place" ? item.scope : null;
  return {
    row: {
      id: item.id,
      kind: item.kind,
      category: item.category,
      title: item.title,
      text: item.text,
      reference: item.reference ?? null,
      flooding: item.flooding ?? null,
      neighborhood: item.neighborhood,
      scope: item.scope,
      lng: point?.lng ?? null,
      lat: point?.lat ?? null,
      visibility: item.visibility,
      authorNick: item.author,
      community: item.community,
      confirmations: item.confirmations,
      followers: item.followers,
      updates: item.updates,
      guest: item.guest ?? false,
      moderation: item.moderation ?? "published",
      demo: false,
      createdAt: now,
      updatedAt: now,
    },
    events: (item.events ?? []).map(({ kind, actor, text }) => ({ itemId: item.id, at: now, kind, actor, text })),
    photos: newPhotoRows(
      item.id,
      item.photos.map((p) => ({ src: p.src, by: p.by })),
      now,
      0,
      accountId,
    ),
  };
}

/** Photos added at `now`, after the `from` already on the item. Every one waits for moderation's first look. */
export const newPhotoRows = (
  itemId: string,
  photos: { src: string; by: string }[],
  now: Date,
  from: number,
  accountId: string | null,
) =>
  photos.map((p, i): PhotoInsert => ({
    itemId,
    src: p.src,
    storageKey: storageKeyOf(p.src),
    takenAt: now,
    by: p.by,
    position: from + i,
    accountId,
    review: "pending",
  }));
