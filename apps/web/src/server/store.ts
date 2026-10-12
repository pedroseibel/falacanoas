import type { ImageType, Item } from "@fala/core";
import { fixtures } from "@fala/instance-canoas/fixtures";

/**
 * In-memory store until the database is connected: the fictional fixtures plus whatever people
 * register while this server runs. Everything here disappears on restart (the done screen says so).
 *
 * Each entry keeps, privately, the account behind it: anonymous items still answer to an account
 * (moderation, court orders), but that link never leaves the server.
 */
interface Entry {
  item: Item;
  accountId: string | null;
  /** When it was created or last touched here (ms); 0 for fixtures, whose ages are fixed. */
  touchedAt: number;
  createdAt: number;
  confirmedBy: Set<string>;
}

const entries = new Map<string, Entry>(
  fixtures.items.map((item) => [
    item.id,
    { item, accountId: null, touchedAt: 0, createdAt: 0, confirmedBy: new Set() },
  ]),
);

/** Items touched here age with the real clock; fixtures keep their fictional ages. */
const view = (e: Entry, now: number): Item =>
  e.touchedAt ? { ...e.item, updatedMinutesAgo: Math.max(0, Math.floor((now - e.touchedAt) / 60_000)) } : e.item;

export function listItems(now = Date.now()): Item[] {
  return [...entries.values()].toReversed().map((e) => view(e, now));
}

export function findItem(id: string, now = Date.now()): Item | null {
  const e = entries.get(id);
  return e ? view(e, now) : null;
}

export const hasItem = (id: string) => entries.has(id);

export function addItem(item: Item, accountId: string) {
  const now = Date.now();
  entries.set(item.id, { item, accountId, touchedAt: now, createdAt: now, confirmedBy: new Set() });
}

export const hasConfirmed = (id: string, accountId: string) => entries.get(id)?.confirmedBy.has(accountId) ?? false;

/** Records one person's confirmation; false if they had already confirmed this item. */
export function markConfirmed(id: string, accountId: string): boolean {
  const e = entries.get(id);
  if (!e || e.confirmedBy.has(accountId)) return false;
  e.confirmedBy.add(accountId);
  return true;
}

export function replaceItem(item: Item) {
  const e = entries.get(item.id);
  if (e) entries.set(item.id, { ...e, item, touchedAt: Date.now() });
}

/** How many items this account created in the last `ms`. */
export const createdSince = (accountId: string, ms: number, now = Date.now()) =>
  [...entries.values()].filter((e) => e.accountId === accountId && now - e.createdAt < ms).length;

/* ---------- Photos (R2 or Supabase Storage later) ---------- */

const photos = new Map<string, { bytes: Uint8Array<ArrayBuffer>; type: ImageType }>();
/** A ceiling so a long-running dev server can't be filled up. */
const MAX_PHOTOS = 400;

export const photoRoom = () => MAX_PHOTOS - photos.size;

/** Stores a photo already stripped of metadata and returns its public path. */
export function putPhoto(bytes: Uint8Array<ArrayBuffer>, type: ImageType): string {
  const key = `${crypto.randomUUID()}.${type === "image/webp" ? "webp" : "jpg"}`;
  photos.set(key, { bytes, type });
  return `/api/fotos/${key}`;
}

export const getPhoto = (key: string) => photos.get(key) ?? null;
