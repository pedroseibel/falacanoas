import { FLAG_LABEL, ReportReasonSchema, type Item, type ModerationFlag, type ReportReason } from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "./db/client";
import { contentReports, itemAuthors, itemEvents, itemPhotos, items, moderationCases } from "./db/schema";
import { findItem, hashKey } from "./items";
import { member, type Failure } from "./member";
import {
  ACTOR,
  applyDecision,
  isModerator,
  moderatorOf,
  restore,
  targetAccount,
  targetOf,
  type CaseRow,
  type CaseTarget,
} from "./moderation-store";
import { notifyFollowers, notifyPlaces } from "./push-send";
import { getSession } from "./session";

/**
 * Moderation (DECISIONS round 5; round 18, Q19 and Q31; the abuse review of 2026-10-13). Volunteer
 * moderators decide what the pre-screen held, every guest pin, every photo's first look, and every
 * report. They never see who posted: each case shows a random handle and, at most, how many of the
 * same person's posts were refused before. Every removal is written into the item's history, and
 * whoever posted can contest it before someone else.
 */

const FLAGS = new Set(Object.keys(FLAG_LABEL));
const isFlag = (f: string): f is ModerationFlag => FLAGS.has(f);
const isReason = (r: string): r is ReportReason => ReportReasonSchema.safeParse(r).success;

export interface QueuePhoto {
  id: string;
  src: string;
  by: string;
  takenAt: string;
}

/** What people reported, without who: how many per reason, and the words some of them added. */
export interface ReportSummary {
  reasons: { reason: ReportReason; n: number }[];
  notes: string[];
}

interface CaseBase {
  id: string;
  reason: CaseRow["reason"];
  /** An opaque handle: the only thing about the person behind it a moderator sees. */
  handle: string;
  /** Earlier refusals of the same person's posts, never who they are. */
  priorRefusals: number;
  /** The item as everyone reads it, for context. */
  item: Item;
  reports: ReportSummary | null;
  contest: { text: string; at: string } | null;
  decided: { status: string; note: string | null } | null;
  /** This moderator made the decision being contested: someone else judges the contest. */
  decidedByYou: boolean;
}

export type QueueCase =
  | (CaseBase & { target: "item"; flags: ModerationFlag[]; photos: QueuePhoto[] })
  | (CaseBase & { target: "photo"; photo: QueuePhoto })
  | (CaseBase & { target: "update"; update: { actor: string; text: string; at: string } });

const pinAuthor = alias(itemAuthors, "pin_author");
const targetAuthors = alias(itemAuthors, "target_author");
/** Who is behind a case's target (see moderation-store's targetAccount), as one SQL expression. */
const targetAccountSql = sql<
  string | null
>`coalesce(${itemPhotos.accountId}, ${itemEvents.accountId}, ${targetAuthors.accountId})`;

const iso = (d: Date) => d.toISOString();
const urgent = (c: QueueCase) => c.reports?.reasons.some((r) => r.reason === "sexual" || r.reason === "child");

/** Open cases and open contests, for the moderator's bairros, never about their own posts. */
export const getModerationQueue = createServerFn({ method: "GET" }).handler(async (): Promise<QueueCase[] | null> => {
  const user = (await getSession())?.user;
  const mod = user ? await moderatorOf(user.id) : null;
  if (!user || !mod) return null;
  const rows = await db
    .select({
      c: moderationCases,
      neighborhood: items.neighborhood,
      handle: items.moderationHandle,
      pinAuthor: pinAuthor.accountId,
      account: targetAccountSql,
      photo: { id: itemPhotos.id, src: itemPhotos.src, by: itemPhotos.by, takenAt: itemPhotos.takenAt },
      update: { actor: itemEvents.actor, text: itemEvents.text, at: itemEvents.at },
    })
    .from(moderationCases)
    .innerJoin(items, eq(items.id, moderationCases.itemId))
    .leftJoin(pinAuthor, eq(pinAuthor.itemId, moderationCases.itemId))
    .leftJoin(itemPhotos, eq(itemPhotos.id, moderationCases.photoId))
    .leftJoin(itemEvents, eq(itemEvents.id, moderationCases.eventId))
    .leftJoin(
      targetAuthors,
      and(
        eq(targetAuthors.itemId, moderationCases.itemId),
        isNull(moderationCases.photoId),
        isNull(moderationCases.eventId),
      ),
    )
    .where(or(eq(moderationCases.status, "open"), eq(moderationCases.contestStatus, "open")))
    .orderBy(asc(moderationCases.createdAt))
    .limit(100);
  const mine = rows.filter(
    (r) => r.account !== user.id && (!mod.neighborhoods || mod.neighborhoods.includes(r.neighborhood ?? "")),
  );
  if (!mine.length) return [];

  const ids = mine.map((r) => r.c.id);
  const itemIds = [...new Set(mine.map((r) => r.c.itemId))];
  const accounts = [...new Set(mine.flatMap((r) => (r.account ? [r.account] : [])))];
  const [refusals, reports, photos, its] = await Promise.all([
    accounts.length
      ? db
          .select({ account: targetAccountSql, n: count() })
          .from(moderationCases)
          .leftJoin(itemPhotos, eq(itemPhotos.id, moderationCases.photoId))
          .leftJoin(itemEvents, eq(itemEvents.id, moderationCases.eventId))
          .leftJoin(
            targetAuthors,
            and(
              eq(targetAuthors.itemId, moderationCases.itemId),
              isNull(moderationCases.photoId),
              isNull(moderationCases.eventId),
            ),
          )
          .where(and(inArray(moderationCases.status, ["rejected", "republish"]), inArray(targetAccountSql, accounts)))
          .groupBy(targetAccountSql)
      : [],
    db
      .select({
        caseId: contentReports.caseId,
        reason: contentReports.reason,
        n: count(),
        notes: sql<(string | null)[]>`array_agg(${contentReports.note})`,
      })
      .from(contentReports)
      .where(inArray(contentReports.caseId, ids))
      .groupBy(contentReports.caseId, contentReports.reason),
    db
      .select({
        itemId: itemPhotos.itemId,
        id: itemPhotos.id,
        src: itemPhotos.src,
        by: itemPhotos.by,
        takenAt: itemPhotos.takenAt,
      })
      .from(itemPhotos)
      .where(and(inArray(itemPhotos.itemId, itemIds), ne(itemPhotos.review, "removed")))
      .orderBy(asc(itemPhotos.position)),
    Promise.all(itemIds.map(async (id): Promise<[string, Item | null]> => [id, await findItem(id)])),
  ]);
  const refusedBy = new Map(refusals.map((r) => [r.account, r.n]));
  const itemOf = new Map(its);

  const out = mine.flatMap(({ c, handle, pinAuthor: author, account, photo, update }): QueueCase[] => {
    const item = itemOf.get(c.itemId);
    if (!item) return [];
    const target = targetOf(c);
    const mineReports = reports.filter((r) => r.caseId === c.id);
    const refused = account ? (refusedBy.get(account) ?? 0) : 0;
    const base: CaseBase = {
      id: c.id,
      reason: c.reason,
      // Whoever posted the pin keeps the pin's handle; someone who added to it gets one for this case only.
      handle: account && account === author ? (handle ?? "—") : c.id.slice(0, 8),
      priorRefusals: Math.max(0, refused - (c.status === "rejected" || c.status === "republish" ? 1 : 0)),
      item,
      reports: mineReports.length
        ? {
            reasons: mineReports.flatMap((r) => (isReason(r.reason) ? [{ reason: r.reason, n: r.n }] : [])),
            notes: mineReports.flatMap((r) => r.notes.flatMap((n) => (n ? [n] : []))),
          }
        : null,
      contest:
        c.contestStatus === "open" && c.contestText && c.contestedAt
          ? { text: c.contestText, at: iso(c.contestedAt) }
          : null,
      decided: c.status === "open" ? null : { status: c.status, note: c.note },
      decidedByYou: c.decidedBy === user.id,
    };
    if (target === "photo" && photo) return [{ ...base, target, photo: { ...photo, takenAt: iso(photo.takenAt) } }];
    if (target === "update" && update) return [{ ...base, target, update: { ...update, at: iso(update.at) } }];
    if (target !== "item") return [];
    return [
      {
        ...base,
        target,
        flags: c.flags.filter(isFlag),
        photos: photos
          .filter((p) => p.itemId === c.itemId)
          .map(({ id, src, by, takenAt }) => ({ id, src, by, takenAt: iso(takenAt) })),
      },
    ];
  });
  // Nudity and children first; then whoever has waited longest.
  return out.toSorted((a, b) => Number(urgent(b)) - Number(urgent(a)));
});

const DecisionSchema = z.discriminatedUnion("decision", [
  z.object({ caseId: z.uuid(), decision: z.literal("publish") }),
  z.object({ caseId: z.uuid(), decision: z.literal("reject"), note: z.string().trim().min(3).max(280) }),
  z.object({ caseId: z.uuid(), decision: z.literal("republish"), note: z.string().trim().min(3).max(280) }),
]);

/**
 * After something went public, the neighbours hear of it then, not when it was sent: a held pin, to
 * those following its place (BUILD 4.2); a photo past its first look, to the pin's followers.
 */
async function announce(c: CaseRow): Promise<void> {
  const held = c.reason === "guest_pin" || c.reason === "prescreen";
  if (!held && c.reason !== "photo") return;
  const [item, account] = await Promise.all([findItem(c.itemId), targetAccount(db, c)]);
  if (!item || item.moderation) return;
  if (held) notifyPlaces(item, account);
  else if (account) notifyFollowers(item, account, { kind: "photo" });
}

/** A moderator's decision on an open case: its effect, and the line it leaves in the item's history. */
export const decideCase = createServerFn({ method: "POST" })
  .validator(DecisionSchema)
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = (await getSession())?.user;
    if (!user || !(await isModerator(user.id))) return { ok: false, error: "Só moderadores decidem." };
    const now = new Date();
    const result = await db.transaction(async (tx): Promise<Failure | { ok: true; c: CaseRow }> => {
      const [c] = await tx.select().from(moderationCases).where(eq(moderationCases.id, data.caseId)).for("update");
      if (!c || c.status !== "open") return { ok: false, error: "Esse caso já foi decidido." };
      if ((await targetAccount(tx, c)) === user.id)
        return { ok: false, error: "Outra pessoa da moderação precisa decidir." };
      if (data.decision === "republish" && targetOf(c) !== "item")
        return { ok: false, error: "Só um registro inteiro pode ser republicado." };
      const note = data.decision === "publish" ? null : data.note;
      const status = data.decision === "publish" ? "published" : data.decision === "reject" ? "rejected" : "republish";
      await tx
        .update(moderationCases)
        .set({ status, note, decidedBy: user.id, decidedAt: now })
        .where(eq(moderationCases.id, c.id));
      await applyDecision(tx, c, data.decision, note, now);
      return { ok: true, c };
    });
    if (!result.ok) return result;
    if (data.decision === "publish") await announce(result.c);
    return { ok: true };
  });

/** A contest, judged again by someone else: overturned brings the target back, upheld keeps it out. */
export const resolveContest = createServerFn({ method: "POST" })
  .validator(z.object({ caseId: z.uuid(), overturn: z.boolean(), note: z.string().trim().min(3).max(280) }))
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = (await getSession())?.user;
    if (!user || !(await isModerator(user.id))) return { ok: false, error: "Só moderadores decidem." };
    const now = new Date();
    const result = await db.transaction(async (tx): Promise<Failure | { ok: true; c: CaseRow }> => {
      const [c] = await tx.select().from(moderationCases).where(eq(moderationCases.id, data.caseId)).for("update");
      if (!c || c.contestStatus !== "open") return { ok: false, error: "Essa contestação já foi analisada." };
      // Whoever decided the first time doesn't judge the contest of it.
      if (c.decidedBy === user.id) return { ok: false, error: "Outra pessoa da moderação precisa analisar." };
      await tx
        .update(moderationCases)
        .set({ contestStatus: data.overturn ? "overturned" : "upheld", contestNote: data.note })
        .where(eq(moderationCases.id, c.id));
      if (data.overturn) await restore(tx, c, data.note, now);
      else
        await tx.insert(itemEvents).values({
          itemId: c.itemId,
          at: now,
          kind: "moderation",
          actor: ACTOR,
          text: `Contestação analisada: a decisão fica. ${data.note}`,
        });
      return { ok: true, c };
    });
    if (!result.ok) return result;
    // A held pin that never went public goes public now; a photo back from a contest stays quiet.
    if (data.overturn && targetOf(result.c) === "item") await announce(result.c);
    return { ok: true };
  });

/** A case about the item itself (not one of its photos or updates), decided against it. */
const refusedItemCase = (itemId: string) =>
  and(
    eq(moderationCases.itemId, itemId),
    isNull(moderationCases.photoId),
    isNull(moderationCases.eventId),
    inArray(moderationCases.status, ["rejected", "republish"]),
    isNotNull(moderationCases.decidedAt),
  );

/**
 * Whoever posted contests a decision (round 18, Q31): the item's author, through their session or a
 * guest's tracking key; or whoever sent a removed photo or wrote a removed update. One contest per decision.
 */
export const contestDecision = createServerFn({ method: "POST" })
  .validator(
    z.object({
      itemId: z.string().min(4).max(12),
      key: z.string().max(64).nullable(),
      /** A decision about one photo or update; absent for the item's own latest decision. */
      caseId: z.uuid().optional(),
      text: z.string().trim().min(10).max(600),
    }),
  )
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = (await getSession())?.user;
    const [c] = data.caseId
      ? await db
          .select()
          .from(moderationCases)
          .where(
            and(
              eq(moderationCases.id, data.caseId),
              eq(moderationCases.itemId, data.itemId),
              inArray(moderationCases.status, ["rejected", "republish"]),
            ),
          )
      : await db
          .select()
          .from(moderationCases)
          .where(refusedItemCase(data.itemId))
          .orderBy(desc(moderationCases.decidedAt))
          .limit(1);
    if (!c) return { ok: false, error: "Não há decisão para contestar." };
    const own = Boolean(user && (await targetAccount(db, c)) === user.id);
    let byKey = false;
    if (!own && data.key && targetOf(c) === "item") {
      const [row] = await db.select({ hash: items.trackingKeyHash }).from(items).where(eq(items.id, data.itemId));
      byKey = Boolean(row?.hash && (await hashKey(data.key)) === row.hash);
    }
    if (!own && !byKey) return { ok: false, error: "Só quem publicou pode contestar." };
    if (c.contestStatus) return { ok: false, error: "Esta decisão já foi contestada." };
    await db
      .update(moderationCases)
      .set({ contestText: data.text, contestedAt: new Date(), contestStatus: "open" })
      .where(eq(moderationCases.id, c.id));
    return { ok: true };
  });

/** For the item page: the latest decision against the item, and whether it was a takedown of a published one. */
export const getDecision = createServerFn({ method: "GET" })
  .validator(z.string().min(4).max(12))
  .handler(async ({ data }) => {
    const [c] = await db
      .select({
        status: moderationCases.status,
        note: moderationCases.note,
        contest: moderationCases.contestStatus,
        reason: moderationCases.reason,
      })
      .from(moderationCases)
      .where(refusedItemCase(data))
      .orderBy(desc(moderationCases.decidedAt))
      .limit(1);
    return c ? { ...c, takenDown: c.reason === "report" || c.reason === "takedown" } : null;
  });

export interface Removal {
  caseId: string;
  target: Exclude<CaseTarget, "item">;
  note: string | null;
  contest: "open" | "upheld" | "overturned" | null;
}

/** The signed-in person's photos and updates moderation removed from this item, so they can contest. */
export const getMyRemovals = createServerFn({ method: "GET" })
  .validator(z.string().min(4).max(12))
  .handler(async ({ data }): Promise<Removal[]> => {
    const user = (await getSession())?.user;
    if (!user || user.isAnonymous) return [];
    const rows = await db
      .select({
        c: moderationCases,
        account: sql<string | null>`coalesce(${itemPhotos.accountId}, ${itemEvents.accountId})`,
      })
      .from(moderationCases)
      .leftJoin(itemPhotos, eq(itemPhotos.id, moderationCases.photoId))
      .leftJoin(itemEvents, eq(itemEvents.id, moderationCases.eventId))
      .where(
        and(
          eq(moderationCases.itemId, data),
          eq(moderationCases.status, "rejected"),
          or(isNotNull(moderationCases.photoId), isNotNull(moderationCases.eventId)),
        ),
      )
      .orderBy(desc(moderationCases.decidedAt));
    // A contest that won brought the photo or update back: nothing left to show.
    return rows
      .filter((r) => r.account === user.id && r.c.contestStatus !== "overturned")
      .map(({ c }) => ({
        caseId: c.id,
        target: c.photoId ? "photo" : "update",
        note: c.note,
        contest: c.contestStatus,
      }));
  });

/** Whether the signed-in person moderates, for the link in Você and the takedown in "Denunciar". */
export const getIsModerator = createServerFn({ method: "GET" }).handler(async () => {
  const who = await member("moderar");
  if ("error" in who) return false;
  return isModerator(who.id);
});
