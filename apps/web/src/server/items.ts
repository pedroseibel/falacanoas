import { confirmationStatus, confirmItem, dateAgo, isOpen, type ConfirmationStatus, type Item } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { and, asc, count, desc, eq, gt } from "drizzle-orm";
import { db, type Db } from "./db/client";
import { itemAuthors, itemConfirmations, itemEvents, itemPhotos, items } from "./db/schema";
import { itemFromRows, newPhotoRows, rowsForNewItem, type PhotoRow } from "./items-model";

/**
 * Items in Postgres (fala.items and its history tables). The account behind each item stays in
 * item_authors and never leaves the server.
 */

const tz = canoas.timezone;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const photoColumns = {
  itemId: itemPhotos.itemId,
  src: itemPhotos.src,
  takenAt: itemPhotos.takenAt,
  by: itemPhotos.by,
  credit: itemPhotos.credit,
};

function byItem<T extends { itemId: string }>(rows: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) out.set(r.itemId, [...(out.get(r.itemId) ?? []), r]);
  return out;
}

/** Every item, newest first, with photos; histories load with the item page. */
export async function listItems(now = new Date()): Promise<Item[]> {
  const [rows, photos] = await Promise.all([
    db.select().from(items).orderBy(desc(items.createdAt)),
    db.select(photoColumns).from(itemPhotos).orderBy(asc(itemPhotos.position)),
  ]);
  const photosOf = byItem(photos);
  return rows.map((row) => itemFromRows(row, { photos: photosOf.get(row.id) ?? [] }, now, tz));
}

async function readItem(q: Db | Tx, id: string, now: Date): Promise<Item | null> {
  const [row] = await q.select().from(items).where(eq(items.id, id));
  if (!row) return null;
  const [events, photos] = await Promise.all([
    q
      .select({ at: itemEvents.at, kind: itemEvents.kind, actor: itemEvents.actor, text: itemEvents.text })
      .from(itemEvents)
      .where(eq(itemEvents.itemId, id))
      .orderBy(asc(itemEvents.at), asc(itemEvents.seq)),
    q.select(photoColumns).from(itemPhotos).where(eq(itemPhotos.itemId, id)).orderBy(asc(itemPhotos.position)),
  ]);
  return itemFromRows(row, { events, photos: photos satisfies PhotoRow[] }, now, tz);
}

/** One item with its whole history. */
export async function findItem(id: string, now = new Date()): Promise<Item | null> {
  return readItem(db, id, now);
}

export async function itemExists(id: string): Promise<boolean> {
  const [row] = await db.select({ id: items.id }).from(items).where(eq(items.id, id));
  return Boolean(row);
}

/** How many items this account created in the last `ms`. */
export async function createdSince(accountId: string, ms: number, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(itemAuthors)
    .innerJoin(items, eq(items.id, itemAuthors.itemId))
    .where(and(eq(itemAuthors.accountId, accountId), gt(items.createdAt, new Date(now.getTime() - ms))));
  return row?.n ?? 0;
}

/** A new report, its first event and photos, and who is behind it, all or nothing. */
export async function insertItem(item: Item, accountId: string, now: Date): Promise<void> {
  const rows = rowsForNewItem(item, now);
  await db.transaction(async (tx) => {
    await tx.insert(items).values(rows.row);
    await tx.insert(itemAuthors).values({ itemId: item.id, accountId });
    if (rows.events.length) await tx.insert(itemEvents).values(rows.events);
    if (rows.photos.length) await tx.insert(itemPhotos).values(rows.photos);
  });
}

export type JoinOutcome = { item: Item; confirmation: ConfirmationStatus } | null;

/**
 * "Eu também": a neighbour confirms an open occurrence, optionally with current photos. The row is
 * locked while the confirmation is judged (round 18, Q17: one per account, never the author, phone
 * verified ≥72 h ago) and written, so two taps can't count twice. Null when it isn't open.
 */
export async function joinItem({
  id,
  accountId,
  by,
  photos,
  phoneVerifiedAt,
  now,
}: {
  id: string;
  accountId: string;
  by: string;
  photos: string[];
  phoneVerifiedAt: Date | null;
  now: Date;
}): Promise<JoinOutcome> {
  const outcome = await db.transaction(async (tx) => {
    const [locked] = await tx.select({ id: items.id }).from(items).where(eq(items.id, id)).for("update");
    if (!locked) return null;
    const item = await readItem(tx, id, now);
    if (!item || item.kind !== "occurrence" || !isOpen(item)) return null;
    const [authored, confirmed] = await Promise.all([
      tx
        .select({ id: itemAuthors.itemId })
        .from(itemAuthors)
        .where(and(eq(itemAuthors.itemId, id), eq(itemAuthors.accountId, accountId))),
      tx
        .select({ id: itemConfirmations.itemId })
        .from(itemConfirmations)
        .where(and(eq(itemConfirmations.itemId, id), eq(itemConfirmations.accountId, accountId))),
    ]);
    // The author's own report never counts as a neighbour's confirmation.
    const confirmation = confirmationStatus({
      alreadyConfirmed: authored.length > 0 || confirmed.length > 0,
      phoneVerifiedAt,
      now,
    });
    const next = confirmItem(item, canoas, {
      by,
      photos,
      now,
      counts: confirmation === "counts",
      dateAgo: (days) => dateAgo(now, days),
    });
    if (next === item) return { confirmation };
    if (confirmation === "counts") await tx.insert(itemConfirmations).values({ itemId: id, accountId });
    await tx
      .update(items)
      .set({ confirmations: next.confirmations, community: next.community, updates: next.updates, updatedAt: now })
      .where(eq(items.id, id));
    const added = next.photos.slice(item.photos.length).map((p) => ({ src: p.src, by: p.by }));
    if (added.length) await tx.insert(itemPhotos).values(newPhotoRows(id, added, now, item.photos.length));
    const event = next.events?.at(-1);
    if (event)
      await tx
        .insert(itemEvents)
        .values({ itemId: id, at: now, kind: event.kind, actor: event.actor, text: event.text });
    return { confirmation };
  });
  if (!outcome) return null;
  const item = await findItem(id, now);
  return item ? { item, confirmation: outcome.confirmation } : null;
}
