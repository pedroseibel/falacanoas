import {
  CONTENT_REPORT_ACTION,
  DAY_MS,
  hidesAtOnce,
  ItemIdSchema,
  limitMessage,
  postingLimits,
  ReportReasonSchema,
  standingMessage,
  weightOf,
} from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { and, count, eq, gte, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { contentReports, escalations, itemEvents, itemPhotos, items, moderationCases } from "./db/schema";
import type { Failure } from "./member";
import { covers, decide, escalateCase, openCaseFor } from "./moderation-store";
import { targetAccount } from "./case-target";
import { sessionModerator } from "./moderator";
import { dayOf, standingOf } from "./sanctions-store";
import { getSession } from "./session";
import { isHuman } from "./vault";

/**
 * "Denunciar" (the abuse review of 2026-10-13): anyone can report a published pin, one of its photos
 * or one update. Each report joins its target's open case, so a pile of reports is one decision.
 * A neighbour's report of nudity or a child takes the photo down at once, until a moderator looks;
 * a moderator can also take something down directly. Every removal is written into the history and
 * can be contested.
 */

const TargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("item") }),
  z.object({ type: z.literal("photo"), id: z.uuid() }),
  z.object({ type: z.literal("update"), id: z.uuid() }),
]);
type Target = z.infer<typeof TargetSchema>;

/** The target, if it's something everyone can see right now on this published item. */
async function visibleTarget(itemId: string, target: Target): Promise<boolean> {
  const [item] = await db.select({ moderation: items.moderation }).from(items).where(eq(items.id, itemId));
  if (item?.moderation !== "published") return false;
  if (target.type === "item") return true;
  if (target.type === "photo") {
    const [p] = await db
      .select({ id: itemPhotos.id })
      .from(itemPhotos)
      .where(and(eq(itemPhotos.id, target.id), eq(itemPhotos.itemId, itemId), eq(itemPhotos.review, "approved")));
    return Boolean(p);
  }
  const [e] = await db
    .select({ id: itemEvents.id })
    .from(itemEvents)
    .where(
      and(
        eq(itemEvents.id, target.id),
        eq(itemEvents.itemId, itemId),
        eq(itemEvents.kind, "update_added"),
        isNull(itemEvents.hiddenAt),
      ),
    );
  return Boolean(e);
}

const refs = (target: Target) =>
  target.type === "photo" ? { photoId: target.id } : target.type === "update" ? { eventId: target.id } : {};

export const reportContent = createServerFn({ method: "POST" })
  .validator(
    z.object({
      itemId: ItemIdSchema,
      target: TargetSchema,
      reason: ReportReasonSchema,
      note: z.string().trim().max(280).nullable(),
      turnstile: z.string().max(4096).nullable(),
    }),
  )
  .handler(async ({ data }): Promise<Failure | { ok: true; hidden: boolean }> => {
    const user = (await getSession())?.user;
    const member = user && !user.isAnonymous && user.phoneVerifiedAt ? user : null;
    let muted = false;
    if (member) {
      const standing = await standingOf(db, member.id);
      if (standing.kind === "suspend") return { ok: false, error: standingMessage(standing, dayOf) };
      muted = standing.kind === "mute";
      const limits = postingLimits(member.phoneVerifiedAt ?? null, new Date());
      const [sent] = await db
        .select({ n: count() })
        .from(contentReports)
        .where(
          and(eq(contentReports.reporterId, member.id), gte(contentReports.createdAt, new Date(Date.now() - DAY_MS))),
        );
      if ((sent?.n ?? 0) >= limits.reports) return { ok: false, error: limitMessage("reports", limits) };
    } else if (!(await isHuman(data.turnstile, CONTENT_REPORT_ACTION))) {
      return { ok: false, error: "Não deu para confirmar que a denúncia veio de uma pessoa. Tente de novo." };
    }
    const itemId = data.itemId;
    if (!(await visibleTarget(itemId, data.target))) return { ok: false, error: "Isso já não está mais no ar." };

    const hidden = await db.transaction(async (tx) => {
      const { id: caseId } = await openCaseFor(tx, itemId, refs(data.target), "report");
      await tx
        .insert(contentReports)
        .values({ caseId, reason: data.reason, note: data.note || null, reporterId: member?.id ?? null })
        .onConflictDoNothing();
      if (data.target.type !== "photo") return false;
      // Hide first: unless a moderator already looked at a report on this photo and kept it.
      const [kept] = await tx
        .select({ id: moderationCases.id })
        .from(moderationCases)
        .where(
          and(
            eq(moderationCases.photoId, data.target.id),
            inArray(moderationCases.reason, ["report", "takedown"]),
            eq(moderationCases.status, "published"),
          ),
        )
        .limit(1);
      const hide = hidesAtOnce({ target: "photo", reason: data.reason, muted, keptBefore: Boolean(kept) });
      if (hide) await tx.update(itemPhotos).set({ review: "pending" }).where(eq(itemPhotos.id, data.target.id));
      return hide;
    });
    return { ok: true, hidden };
  });

/**
 * A moderator takes something down without waiting for a report: it decides the target's open case
 * if there is one, or opens a decided one. Only in the bairros they moderate, never their own posts.
 */
export const takeDown = createServerFn({ method: "POST" })
  .validator(
    z.object({
      itemId: ItemIdSchema,
      target: TargetSchema,
      note: z.string().trim().min(3).max(280),
      weight: z.enum(["none", "strike", "grave"]).optional(),
    }),
  )
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = await sessionModerator();
    if (!user) return { ok: false, error: "Só moderadores tiram conteúdo do ar." };
    const itemId = data.itemId;
    const [item] = await db.select({ neighborhood: items.neighborhood }).from(items).where(eq(items.id, itemId));
    if (!item) return { ok: false, error: "Esse registro não existe." };
    if (!covers(user.mod, item.neighborhood))
      return { ok: false, error: "Esse registro é de um bairro que você não modera." };
    if (!(await visibleTarget(itemId, data.target))) return { ok: false, error: "Isso já não está mais no ar." };
    const target = { itemId, photoId: null, eventId: null, ...refs(data.target) };
    if ((await targetAccount(db, target)) === user.id)
      return { ok: false, error: "Outra pessoa da moderação precisa decidir sobre o que você publicou." };
    const now = new Date();
    return db.transaction(async (tx): Promise<Failure | { ok: true }> => {
      const c = await openCaseFor(tx, itemId, refs(data.target), "takedown");
      await decide(tx, c, {
        decision: "reject",
        note: data.note,
        weight: data.weight ?? weightOf(data.note),
        by: user.id,
        now,
      });
      return { ok: true };
    });
  });

/**
 * Child sexual abuse material (round 20; ECA arts. 241-A and 241-B; Lei 15.211/2025 art. 27). A
 * moderator who meets it removes it and hands it on in one step: it comes down at once, is never shown
 * again (not even to moderators), is preserved for the authorities, and the account is suspended. The
 * controller reports it (`bun --filter @fala/web escalation`) and deletes it once an authority has it.
 */
export const escalateChildAbuse = createServerFn({ method: "POST" })
  .validator(z.union([z.object({ caseId: z.uuid() }), z.object({ itemId: ItemIdSchema, target: TargetSchema })]))
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = await sessionModerator();
    if (!user) return { ok: false, error: "Só moderadores encaminham." };
    const now = new Date();
    return db.transaction(async (tx): Promise<Failure | { ok: true }> => {
      const [c] =
        "caseId" in data
          ? await tx.select().from(moderationCases).where(eq(moderationCases.id, data.caseId)).for("update")
          : [await openCaseFor(tx, data.itemId, refs(data.target), "takedown")];
      if (!c) return { ok: false, error: "Esse caso não existe." };
      const [already] = await tx.select({ id: escalations.id }).from(escalations).where(eq(escalations.caseId, c.id));
      if (already) return { ok: true };
      const account = await targetAccount(tx, c);
      if (account === user.id) return { ok: false, error: "Outra pessoa da moderação precisa encaminhar." };
      await escalateCase(tx, c, { userId: user.id, source: "moderation" }, now);
      return { ok: true };
    });
  });
