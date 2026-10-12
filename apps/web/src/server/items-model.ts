import { calendarDays, eventStamp, type Item, type ItemEvent } from "@fala/core";
import type { itemEvents, itemPhotos, items } from "./db/schema";

/**
 * Rows ↔ items, without the database: what is stored are instants; what an item carries are the
 * readings of those instants at `now` ("43 dias", "há 38 min", "hoje · 13:42").
 */

export type ItemRow = typeof items.$inferSelect;
export type ItemInsert = typeof items.$inferInsert;
export type EventRow = Pick<typeof itemEvents.$inferSelect, "at" | "kind" | "actor" | "text">;
export type EventInsert = typeof itemEvents.$inferInsert;
export type PhotoRow = Pick<typeof itemPhotos.$inferSelect, "src" | "takenAt" | "by" | "credit">;
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

export function itemFromRows(
  row: ItemRow,
  { events, photos }: { events?: EventRow[]; photos: PhotoRow[] },
  now: Date,
  timezone: string,
): Item {
  const stamp = (at: Date) => eventStamp(at, now, timezone);
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    title: row.title,
    text: row.text,
    neighborhood: row.neighborhood,
    scope: row.scope,
    days: clockDays(row, now, timezone),
    updatedMinutesAgo: Math.max(0, Math.floor((now.getTime() - row.updatedAt.getTime()) / 60_000)),
    confirmations: row.confirmations,
    followers: row.followers,
    updates: row.updates,
    photos: photos.map((p) => ({
      src: p.src,
      takenAt: stamp(p.takenAt),
      by: p.by,
      ...(p.credit ? { credit: p.credit } : {}),
    })),
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
    ...(events ? { events: events.map((e): ItemEvent => ({ ...e, at: stamp(e.at) })) } : {}),
  };
}

/** Where a photo lives in Storage, from its public path; null for static demo photos. */
export const storageKeyOf = (src: string) => (src.startsWith("/api/fotos/") ? src.slice("/api/fotos/".length) : null);

/**
 * A freshly built item (core's itemFromReport) as rows. Everything in it happened at `now`: one
 * "created" event and the photos it was posted with.
 */
export function rowsForNewItem(
  item: Item,
  now: Date,
): { row: ItemInsert; events: EventInsert[]; photos: PhotoInsert[] } {
  const point = item.scope.type === "point" || item.scope.type === "place" ? item.scope : null;
  return {
    row: {
      id: item.id,
      kind: item.kind,
      category: item.category,
      title: item.title,
      text: item.text,
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
    ),
  };
}

/** Photos added at `now`, after the `from` already on the item. */
export const newPhotoRows = (itemId: string, photos: { src: string; by: string }[], now: Date, from: number) =>
  photos.map((p, i): PhotoInsert => ({
    itemId,
    src: p.src,
    storageKey: storageKeyOf(p.src),
    takenAt: now,
    by: p.by,
    position: from + i,
  }));
