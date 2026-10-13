import type { ModerationFlag } from "@fala/core";
import { and, eq, sql } from "drizzle-orm";
import { db, type Db } from "./db/client";
import { itemAuthors, itemEvents, itemPhotos, items, moderationCases, moderators } from "./db/schema";

/**
 * Moderation's plain server helpers, apart from the server functions in moderation.ts: a module the
 * browser imports must hold only server functions, or the database client leaks into the bundle.
 */

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Q = Db | Tx;
export type CaseRow = typeof moderationCases.$inferSelect;
type CaseReason = CaseRow["reason"];

export const ACTOR = "Moderação";

/** Gives the item its opaque handle if it has none yet: the only thing about an author moderators see. */
async function ensureHandle(q: Q, itemId: string): Promise<void> {
  const handle = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  await q
    .update(items)
    .set({ moderationHandle: sql`coalesce(${items.moderationHandle}, ${handle})` })
    .where(eq(items.id, itemId));
}

/** Opens a case about the item, or about one of its photos or updates. Runs inside the caller's transaction. */
export async function openCase(
  q: Q,
  itemId: string,
  reason: CaseReason,
  flags: ModerationFlag[] = [],
  target: { photoId?: string; eventId?: string } = {},
): Promise<string> {
  await ensureHandle(q, itemId);
  const [c] = await q
    .insert(moderationCases)
    .values({ itemId, reason, flags, photoId: target.photoId ?? null, eventId: target.eventId ?? null })
    .returning({ id: moderationCases.id });
  if (!c) throw new Error("caso não criado");
  return c.id;
}

/** Each new photo on a published item waits for moderation's first look: one case per photo. */
export async function openPhotoCases(q: Q, itemId: string, photoIds: string[]): Promise<void> {
  if (!photoIds.length) return;
  await ensureHandle(q, itemId);
  await q
    .insert(moderationCases)
    .values(photoIds.map((photoId): typeof moderationCases.$inferInsert => ({ itemId, reason: "photo", photoId })));
}

export async function moderatorOf(accountId: string) {
  const [row] = await db.select().from(moderators).where(eq(moderators.accountId, accountId));
  return row ?? null;
}

export async function isModerator(accountId: string): Promise<boolean> {
  return Boolean(await moderatorOf(accountId));
}

/** What a case is about: the item as a whole, one photo, or one update. */
export type CaseTarget = "item" | "photo" | "update";
export const targetOf = (c: Pick<CaseRow, "photoId" | "eventId">): CaseTarget =>
  c.photoId ? "photo" : c.eventId ? "update" : "item";

/** Whether the case judges an item before it ever went public (a guest pin, or text the pre-screen held). */
const heldItem = (c: Pick<CaseRow, "reason">) => c.reason === "guest_pin" || c.reason === "prescreen";

/**
 * The account behind what a case is about: who sent the photo, who wrote the update, or who posted the
 * item. Never leaves the server: it decides who can contest, and whose refusals a moderator counts.
 */
export async function targetAccount(q: Q, c: Pick<CaseRow, "itemId" | "photoId" | "eventId">): Promise<string | null> {
  if (c.photoId) {
    const [p] = await q.select({ a: itemPhotos.accountId }).from(itemPhotos).where(eq(itemPhotos.id, c.photoId));
    return p?.a ?? null;
  }
  if (c.eventId) {
    const [e] = await q.select({ a: itemEvents.accountId }).from(itemEvents).where(eq(itemEvents.id, c.eventId));
    return e?.a ?? null;
  }
  const [a] = await q.select({ a: itemAuthors.accountId }).from(itemAuthors).where(eq(itemAuthors.itemId, c.itemId));
  return a?.a ?? null;
}

/** The history line a removal leaves, with the moderator's reason. */
const REMOVED: Record<CaseTarget, (note: string) => string> = {
  item: (note) => `Retirado do mapa pela moderação: ${note}`,
  photo: (note) => `Foto removida pela moderação: ${note}`,
  update: (note) => `Atualização removida pela moderação: ${note}`,
};

const RESTORED: Record<CaseTarget, string> = {
  item: "Contestação aceita: publicado.",
  photo: "Contestação aceita: a foto voltou.",
  update: "Contestação aceita: a atualização voltou.",
};

async function history(q: Q, itemId: string, now: Date, text: string): Promise<void> {
  await q.insert(itemEvents).values({ itemId, at: now, kind: "moderation", actor: ACTOR, text });
}

/**
 * What a decision does to its target, and the line it leaves in the item's history. Showing is quiet
 * for routine looks (a photo approved, a report dismissed); every removal is written down, with its
 * reason, because nothing on the Fala disappears silently.
 */
export async function applyDecision(
  q: Q,
  c: CaseRow,
  decision: "publish" | "reject" | "republish",
  note: string | null,
  now: Date,
): Promise<void> {
  const target = targetOf(c);
  const show = decision === "publish";
  if (target === "photo" && c.photoId) {
    await q
      .update(itemPhotos)
      .set({ review: show ? "approved" : "removed" })
      .where(eq(itemPhotos.id, c.photoId));
    if (!show) await history(q, c.itemId, now, REMOVED.photo(note ?? ""));
    return;
  }
  if (target === "update" && c.eventId) {
    await q
      .update(itemEvents)
      .set({ hiddenAt: show ? null : now })
      .where(eq(itemEvents.id, c.eventId));
    if (!show) await history(q, c.itemId, now, REMOVED.update(note ?? ""));
    return;
  }
  if (heldItem(c)) {
    // A held item is judged whole: its photos go up or stay out with it.
    await q
      .update(items)
      .set({ moderation: show ? "published" : "rejected", updatedAt: now })
      .where(eq(items.id, c.itemId));
    await q
      .update(itemPhotos)
      .set({ review: show ? "approved" : "removed" })
      .where(and(eq(itemPhotos.itemId, c.itemId), eq(itemPhotos.review, "pending")));
    await history(
      q,
      c.itemId,
      now,
      show
        ? "Publicado após moderação."
        : decision === "republish"
          ? `Pedido de republicação, assinada com apelido: ${note ?? ""}`
          : `Não publicado: ${note ?? ""}`,
    );
    return;
  }
  // A report about a published item: kept as it is, or taken off the map.
  if (show) return;
  await q.update(items).set({ moderation: "rejected", updatedAt: now }).where(eq(items.id, c.itemId));
  await history(q, c.itemId, now, REMOVED.item(note ?? ""));
}

/** A contest won: the target comes back, and the history says so. */
export async function restore(q: Q, c: CaseRow, note: string, now: Date): Promise<void> {
  const target = targetOf(c);
  if (target === "photo" && c.photoId)
    await q.update(itemPhotos).set({ review: "approved" }).where(eq(itemPhotos.id, c.photoId));
  else if (target === "update" && c.eventId)
    await q.update(itemEvents).set({ hiddenAt: null }).where(eq(itemEvents.id, c.eventId));
  else {
    await q.update(items).set({ moderation: "published", updatedAt: now }).where(eq(items.id, c.itemId));
    // A held item's photos were refused with it, and come back with it.
    if (heldItem(c))
      await q
        .update(itemPhotos)
        .set({ review: "approved" })
        .where(and(eq(itemPhotos.itemId, c.itemId), eq(itemPhotos.review, "removed")));
  }
  await history(q, c.itemId, now, `${RESTORED[target]} ${note}`);
}
