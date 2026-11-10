import { DAY_MS, type ModerationFlag, type RemovalWeight, SUSPEND_DAYS } from "@fala/core";
import { and, eq, isNull, sql } from "drizzle-orm";
import { targetAccount } from "./case-target";
import { recheck, strike } from "./sanctions-store";
import { db, type Q, type Tx } from "./db/client";
import { escalations, itemEvents, itemPhotos, items, moderationCases, moderators, sanctions } from "./db/schema";

/**
 * Moderation's plain server helpers, apart from the server functions in moderation.ts: a module the
 * browser imports must hold only server functions, or the database client leaks into the bundle.
 */

export type CaseRow = typeof moderationCases.$inferSelect;
export type CaseReason = CaseRow["reason"];

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

/**
 * The open case about one target (a photo, an update, or the item itself when neither is given),
 * locked for this transaction; opened for `reason` when there is none.
 */
export async function openCaseFor(
  tx: Tx,
  itemId: string,
  target: { photoId?: string; eventId?: string },
  reason: CaseReason,
): Promise<CaseRow> {
  const find = (id?: string) =>
    tx
      .select()
      .from(moderationCases)
      .where(
        id
          ? eq(moderationCases.id, id)
          : and(
              eq(moderationCases.itemId, itemId),
              eq(moderationCases.status, "open"),
              target.photoId ? eq(moderationCases.photoId, target.photoId) : isNull(moderationCases.photoId),
              target.eventId ? eq(moderationCases.eventId, target.eventId) : isNull(moderationCases.eventId),
            ),
      )
      .limit(1)
      .for("update");
  const [open] = await find();
  const [c] = open ? [open] : await find(await openCase(tx, itemId, reason, [], target));
  if (!c) throw new Error("caso não encontrado");
  return c;
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

export type Moderator = NonNullable<Awaited<ReturnType<typeof moderatorOf>>>;

export const covers = (mod: Pick<Moderator, "neighborhoods">, neighborhood: string | null) =>
  !mod.neighborhoods || mod.neighborhoods.includes(neighborhood ?? "");

export type CaseTarget = "item" | "photo" | "update";
export const targetOf = (c: Pick<CaseRow, "photoId" | "eventId">): CaseTarget =>
  c.photoId ? "photo" : c.eventId ? "update" : "item";

/** Whether the case judges an item before it ever went public: a guest pin, held text, or a muted account's. */
export const heldItem = (c: Pick<CaseRow, "reason">) =>
  c.reason === "guest_pin" || c.reason === "prescreen" || c.reason === "muted";

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
async function applyDecision(
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
  if (show) return;
  await q.update(items).set({ moderation: "rejected", updatedAt: now }).where(eq(items.id, c.itemId));
  await history(q, c.itemId, now, REMOVED.item(note ?? ""));
}

async function restore(q: Q, c: CaseRow, note: string, now: Date): Promise<void> {
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

/**
 * A moderator's decision on a case, whole: the case is closed with it, its target goes up or comes
 * down with a line in the item's history, and a removal that weighs counts against whoever sent it.
 */
export async function decide(
  tx: Tx,
  c: CaseRow,
  d: {
    decision: "publish" | "reject" | "republish";
    note: string | null;
    weight: RemovalWeight;
    by: string;
    now: Date;
  },
): Promise<void> {
  const status = d.decision === "publish" ? "published" : d.decision === "reject" ? "rejected" : "republish";
  await tx
    .update(moderationCases)
    .set({ status, note: d.note, weight: d.weight, decidedBy: d.by, decidedAt: d.now })
    .where(eq(moderationCases.id, c.id));
  await applyDecision(tx, c, d.decision, d.note, d.now);
  if (d.decision === "reject" && d.weight !== "none") await strike(tx, await targetAccount(tx, c), d.now);
}

/** A contest won: the target comes back, and an automatic mute the remaining removals no longer justify is lifted. */
export async function overturn(tx: Tx, c: CaseRow, note: string, now: Date): Promise<void> {
  await restore(tx, c, note, now);
  await recheck(tx, await targetAccount(tx, c), now);
}

/** What the item's history says: neutral, so the history itself never describes the material. */
const ILLEGAL = "Conteúdo ilegal removido.";
const SUSPENDED_FOR_LAW =
  "Uma publicação sua foi removida por violar a lei. O caso está com a equipe responsável pelo Fala.";

/**
 * Hands a case over as child abuse material (round 20; ECA arts. 241-A and 241-B), in the caller's
 * transaction: the content comes down and is never served again, not even to moderators; the bytes
 * stay for the authorities; the escalation is recorded; the account is suspended. A moderator does
 * this from the queue; a known-material match does it with no one having seen the photo
 * (research/legal/hash-matching.md), and the escalation says so, as the report to the PF must.
 */
export async function escalateCase(
  tx: Tx,
  c: CaseRow,
  by: {
    userId: string | null;
    source: "moderation" | "hash_match";
    matchClass?: string | null;
    matchType?: string | null;
  },
  now: Date,
): Promise<"escalated" | "already"> {
  const [already] = await tx.select({ id: escalations.id }).from(escalations).where(eq(escalations.caseId, c.id));
  if (already) return "already";
  const account = await targetAccount(tx, c);
  if (c.status !== "rejected") {
    await tx
      .update(moderationCases)
      .set({ status: "rejected", note: ILLEGAL, weight: "grave", decidedBy: by.userId, decidedAt: now })
      .where(eq(moderationCases.id, c.id));
    await applyDecision(tx, c, "reject", ILLEGAL, now);
  }
  const [escalation] = await tx
    .insert(escalations)
    .values({
      kind: "child_abuse",
      caseId: c.id,
      itemId: c.itemId,
      photoId: c.photoId,
      accountId: account,
      createdBy: by.userId,
      source: by.source,
      matchClass: by.matchClass ?? null,
      matchType: by.matchType ?? null,
    })
    .returning({ id: escalations.id });
  if (account && escalation)
    await tx.insert(sanctions).values({
      accountId: account,
      kind: "suspend",
      source: "auto",
      reason: SUSPENDED_FOR_LAW,
      startsAt: now,
      endsAt: new Date(now.getTime() + SUSPEND_DAYS * DAY_MS),
      confirmedAt: now,
      escalationId: escalation.id,
    });
  return "escalated";
}
