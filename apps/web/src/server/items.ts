import {
  applyAction,
  confirmationStatus,
  confirmItem,
  dateAgo,
  isOpen,
  localTime,
  QUIET_CLOSE_DAYS,
  quietClose,
  type ActionRefusal,
  type ConfirmationStatus,
  type Item,
  type ItemAction,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { and, asc, count, desc, eq, gt, lte, ne, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db, type Db } from "./db/client";
import { itemAuthors, itemConfirmations, itemEvents, itemFollows, itemPhotos, items, itemVotes } from "./db/schema";
import { itemFromRows, newPhotoRows, rowsForNewItem, type PhotoRow } from "./items-model";
import { openPhotoCases } from "./moderation-store";

/**
 * Items in Postgres (fala.items and its history tables). The account behind each item stays in
 * item_authors and never leaves the server.
 */

const tz = canoas.timezone;

const has = async (q: Promise<unknown[]>) => (await q).length > 0;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const photoColumns = {
  id: itemPhotos.id,
  review: itemPhotos.review,
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

/** Every published item, newest first, with photos; histories load with the item page. */
export async function listItems(now = new Date()): Promise<Item[]> {
  const [rows, photos] = await Promise.all([
    db.select().from(items).where(eq(items.moderation, "published")).orderBy(desc(items.createdAt)),
    db.select(photoColumns).from(itemPhotos).where(ne(itemPhotos.review, "removed")).orderBy(asc(itemPhotos.position)),
  ]);
  const photosOf = byItem(photos);
  return rows.map((row) => itemFromRows(row, { photos: photosOf.get(row.id) ?? [] }, now, tz));
}

type ItemRow = typeof items.$inferSelect;

/** `canSee` decides from the row whether the history is read at all (one query, not two, for a reader). */
async function readItem(
  q: Db | Tx,
  id: string,
  now: Date,
  canSee: (row: ItemRow) => boolean | Promise<boolean> = () => true,
): Promise<Item | null> {
  const [row] = await q.select().from(items).where(eq(items.id, id));
  if (!row || !(await canSee(row))) return null;
  const [events, photos] = await Promise.all([
    q
      .select({
        id: itemEvents.id,
        at: itemEvents.at,
        kind: itemEvents.kind,
        actor: itemEvents.actor,
        text: itemEvents.text,
        hiddenAt: itemEvents.hiddenAt,
      })
      .from(itemEvents)
      .where(eq(itemEvents.itemId, id))
      .orderBy(asc(itemEvents.at), asc(itemEvents.seq)),
    q.select(photoColumns).from(itemPhotos).where(eq(itemPhotos.itemId, id)).orderBy(asc(itemPhotos.position)),
  ]);
  return itemFromRows(row, { events, photos: photos satisfies PhotoRow[] }, now, tz);
}

/** One item with its whole history. Server-side callers that already decided access use this. */
export async function findItem(id: string, now = new Date()): Promise<Item | null> {
  return readItem(db, id, now);
}

export const hashKey = async (key: string) =>
  Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))).toString("hex");

/**
 * One item for a reader. A pin still in moderation opens only with its tracking key, or for the
 * session that dropped it; otherwise it doesn't exist, as far as anyone can tell.
 */
export async function findVisibleItem(
  id: string,
  {
    key,
    accountId,
  }: {
    key: string | null;
    /** Asked only for a pin still in moderation: a published one needs no session lookup. */
    accountId: () => Promise<string | null>;
  },
  now = new Date(),
): Promise<Item | null> {
  return readItem(db, id, now, async (row) => {
    if (row.moderation === "published") return true;
    if (key && row.trackingKeyHash && (await hashKey(key)) === row.trackingKeyHash) return true;
    const account = await accountId();
    return (
      account !== null &&
      has(
        db
          .select({ id: itemAuthors.itemId })
          .from(itemAuthors)
          .where(and(eq(itemAuthors.itemId, id), eq(itemAuthors.accountId, account))),
      )
    );
  });
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

/** Where the next photo goes: after every photo the item ever had, shown or not. */
async function nextPhotoPosition(q: Db | Tx, id: string): Promise<number> {
  const [row] = await q
    .select({ next: sql<number>`coalesce(max(${itemPhotos.position}) + 1, 0)::int` })
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, id));
  return row?.next ?? 0;
}

/**
 * New photos on a published item: stored pending, each with a case for moderation's first look.
 * (A held item's photos are judged with the item, in its own case.)
 */
async function addPhotos(
  q: Db | Tx,
  id: string,
  photos: { src: string; by: string }[],
  accountId: string,
  now: Date,
): Promise<void> {
  if (!photos.length) return;
  const rows = newPhotoRows(id, photos, now, await nextPhotoPosition(q, id), accountId);
  const added = await q.insert(itemPhotos).values(rows).returning({ id: itemPhotos.id });
  await openPhotoCases(
    q,
    id,
    added.map((p) => p.id),
  );
}

/** How many photos this account sent in the last `ms` (round 19's daily limits). */
export async function photosSince(accountId: string, ms: number, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(itemPhotos)
    .where(and(eq(itemPhotos.accountId, accountId), gt(itemPhotos.takenAt, new Date(now.getTime() - ms))));
  return row?.n ?? 0;
}

/** How many updates this account wrote in the last `ms`. */
export async function updatesSince(accountId: string, ms: number, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(itemEvents)
    .where(
      and(
        eq(itemEvents.accountId, accountId),
        eq(itemEvents.kind, "update_added"),
        gt(itemEvents.at, new Date(now.getTime() - ms)),
      ),
    );
  return row?.n ?? 0;
}

/**
 * A new report, its first event and photos, and who is behind it, all or nothing. A published one
 * opens a first-look case per photo; a held one is judged whole, photos included.
 */
export async function insertItem(
  item: Item,
  accountId: string,
  now: Date,
  trackingKeyHash: string | null = null,
): Promise<void> {
  const rows = rowsForNewItem(item, now, accountId);
  await db.transaction(async (tx) => {
    await tx.insert(items).values({ ...rows.row, trackingKeyHash });
    await tx.insert(itemAuthors).values({ itemId: item.id, accountId });
    if (rows.events.length) await tx.insert(itemEvents).values(rows.events);
    if (!rows.photos.length) return;
    const added = await tx.insert(itemPhotos).values(rows.photos).returning({ id: itemPhotos.id });
    if (!item.moderation)
      await openPhotoCases(
        tx,
        item.id,
        added.map((p) => p.id),
      );
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
    if (!item || item.kind !== "occurrence" || !isOpen(item) || item.moderation) return null;
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
    await addPhotos(tx, id, added, accountId, now);
    const event = next.events?.at(-1);
    if (event)
      await tx
        .insert(itemEvents)
        .values({ itemId: id, at: now, kind: event.kind, actor: event.actor, text: event.text, accountId });
    return { confirmation };
  });
  if (!outcome) return null;
  const item = await findItem(id, now);
  return item ? { item, confirmation: outcome.confirmation } : null;
}

/* ---------- Structured actions (rounds 4 and 15) ---------- */

/** "Continua acontecendo" counts once a day: the day on the municipality's calendar. */
const today = (now: Date) => {
  const t = localTime(now, tz);
  return `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;
};

/** What this account has already done with this item, and whether its word moves the status yet. */
export interface ViewerState {
  author: boolean;
  confirmed: boolean;
  saidStillToday: boolean;
  saidResolved: boolean;
  following: boolean;
  /** When a phone verified less than 72 h ago starts to count (ISO); null when it already does. */
  countsFrom: string | null;
}

async function viewerIn(
  q: Db | Tx,
  id: string,
  accountId: string,
  round: number,
  phoneVerifiedAt: Date | null,
  now: Date,
): Promise<ViewerState> {
  const mine = (t: { itemId: AnyPgColumn; accountId: AnyPgColumn }) =>
    and(eq(t.itemId, id), eq(t.accountId, accountId));
  const [author, confirmed, still, resolved, following] = await Promise.all([
    has(q.select({ id: itemAuthors.itemId }).from(itemAuthors).where(mine(itemAuthors))),
    has(q.select({ id: itemConfirmations.itemId }).from(itemConfirmations).where(mine(itemConfirmations))),
    has(
      q
        .select({ id: itemVotes.itemId })
        .from(itemVotes)
        .where(and(mine(itemVotes), eq(itemVotes.kind, "still"), eq(itemVotes.slot, today(now)))),
    ),
    has(
      q
        .select({ id: itemVotes.itemId })
        .from(itemVotes)
        .where(and(mine(itemVotes), eq(itemVotes.kind, "resolved"), eq(itemVotes.slot, String(round)))),
    ),
    has(q.select({ id: itemFollows.itemId }).from(itemFollows).where(mine(itemFollows))),
  ]);
  const independent = confirmationStatus({ alreadyConfirmed: false, phoneVerifiedAt, now }) === "counts";
  return {
    author,
    confirmed,
    saidStillToday: still,
    saidResolved: resolved,
    following,
    countsFrom:
      independent || !phoneVerifiedAt ? null : new Date(phoneVerifiedAt.getTime() + 72 * 3_600_000).toISOString(),
  };
}

export async function viewerOf(id: string, accountId: string, phoneVerifiedAt: Date | null, now = new Date()) {
  const [row] = await db.select({ round: items.round }).from(items).where(eq(items.id, id));
  return row ? viewerIn(db, id, accountId, row.round, phoneVerifiedAt, now) : null;
}

export type ActOutcome = { ok: true; item: Item; viewer: ViewerState } | { ok: false; reason: ActionRefusal | "gone" };

/**
 * One structured action on one item. The row is locked while the action is judged and written, so
 * two taps can't count twice; history is appended, never rewritten.
 */
export async function actOnItem(input: {
  id: string;
  accountId: string;
  by: string;
  phoneVerifiedAt: Date | null;
  action: ItemAction;
  now: Date;
}): Promise<ActOutcome> {
  const { id, accountId, by, phoneVerifiedAt, action, now } = input;
  const result = await db.transaction(async (tx): Promise<ActOutcome> => {
    const [locked] = await tx.select({ round: items.round }).from(items).where(eq(items.id, id)).for("update");
    const item = locked ? await readItem(tx, id, now) : null;
    // A pin in moderation takes no actions until it's published.
    if (!locked || !item || item.moderation) return { ok: false, reason: "gone" };
    const viewer = await viewerIn(tx, id, accountId, locked.round, phoneVerifiedAt, now);
    const already =
      action.type === "confirm"
        ? viewer.confirmed
        : action.type === "still"
          ? viewer.saidStillToday
          : action.type === "resolved" && viewer.saidResolved;
    const out = applyAction(item, action, {
      by,
      author: viewer.author,
      independent: viewer.countsFrom === null && Boolean(phoneVerifiedAt),
      already,
      now,
      timezone: tz,
    });
    if (!out.ok) return out;
    const next = out.item;
    await tx
      .update(items)
      .set({
        community: next.community,
        confirmations: next.confirmations,
        updates: next.updates,
        disagreeing: next.disagreeing ?? null,
        resolvedVotes: next.resolvedVotes ?? 0,
        resolvingSince: next.resolvingSince ? new Date(next.resolvingSince) : null,
        closedAt: next.closedAt ? new Date(next.closedAt) : null,
        round: out.reopened ? sql`${items.round} + 1` : items.round,
        updatedAt: now,
      })
      .where(eq(items.id, id));
    await tx
      .insert(itemEvents)
      .values({ itemId: id, at: now, kind: out.event.kind, actor: out.event.actor, text: out.event.text, accountId });
    await addPhotos(
      tx,
      id,
      out.photos.map((src) => ({ src, by })),
      accountId,
      now,
    );
    if (action.type === "confirm") await tx.insert(itemConfirmations).values({ itemId: id, accountId, createdAt: now });
    if (action.type === "still")
      await tx.insert(itemVotes).values({ itemId: id, accountId, kind: "still", slot: today(now), at: now });
    if (action.type === "resolved")
      await tx
        .insert(itemVotes)
        .values({ itemId: id, accountId, kind: "resolved", slot: String(locked.round), at: now });
    return { ok: true, item: next, viewer };
  });
  if (!result.ok) return result;
  const [item, viewer] = await Promise.all([findItem(id, now), viewerOf(id, accountId, phoneVerifiedAt, now)]);
  return item && viewer ? { ok: true, item, viewer } : { ok: false, reason: "gone" };
}

/** "Acompanhar": on or off. Returns whether the account now follows the item. */
export async function setFollowing(id: string, accountId: string, on: boolean): Promise<boolean> {
  return db.transaction(async (tx) => {
    if (on) {
      const added = await tx.insert(itemFollows).values({ itemId: id, accountId }).onConflictDoNothing().returning();
      if (added.length)
        await tx
          .update(items)
          .set({ followers: sql`${items.followers} + 1` })
          .where(eq(items.id, id));
      return true;
    }
    const removed = await tx
      .delete(itemFollows)
      .where(and(eq(itemFollows.itemId, id), eq(itemFollows.accountId, accountId)))
      .returning();
    if (removed.length)
      await tx
        .update(items)
        .set({ followers: sql`greatest(${items.followers} - 1, 0)` })
        .where(eq(items.id, id));
    return false;
  });
}

/**
 * The daily job (src/server.ts): pins someone said were fixed, undisputed for 15 days, close on their
 * own. Runs outside any request, so it takes its own connection.
 */
export async function closeQuietItems(d: Db, now: Date, by: string): Promise<number> {
  const due = await d
    .select({ id: items.id })
    .from(items)
    .where(
      and(
        eq(items.community, "apparently_resolved"),
        lte(items.resolvingSince, new Date(now.getTime() - QUIET_CLOSE_DAYS * 864e5)),
      ),
    );
  let closed = 0;
  for (const { id } of due) {
    // One transaction per pin, so one failure doesn't hold back the rest.
    // oxlint-disable-next-line no-await-in-loop
    const done = await d.transaction(async (tx) => {
      const [locked] = await tx.select({ id: items.id }).from(items).where(eq(items.id, id)).for("update");
      const item = locked ? await readItem(tx, id, now) : null;
      const out = item ? quietClose(item, now, tz, by) : null;
      if (!out?.item.closedAt) return false;
      const at = new Date(out.item.closedAt);
      await tx.update(items).set({ community: "resolved", closedAt: at, updatedAt: at }).where(eq(items.id, id));
      await tx
        .insert(itemEvents)
        .values({ itemId: id, at, kind: out.event.kind, actor: out.event.actor, text: out.event.text });
      return true;
    });
    if (done) closed++;
  }
  return closed;
}
