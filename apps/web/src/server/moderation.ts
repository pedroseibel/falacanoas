import { FLAG_LABEL, type Item, type ModerationFlag } from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { itemAuthors, itemEvents, items, moderationCases } from "./db/schema";
import { findItem, hashKey } from "./items";
import { member, type Failure } from "./member";
import { isModerator, moderatorOf } from "./moderation-store";
import { getSession } from "./session";

/**
 * Moderation (DECISIONS round 5; round 18, Q19 and Q31). Volunteer moderators decide what the
 * pre-screen held and every guest pin. They never see who posted: each item shows a random handle
 * and, at most, how many of the same author's posts were refused before. Every decision is appended
 * to the item's history, and the author can contest it.
 */

const FLAGS = new Set(Object.keys(FLAG_LABEL));
const isFlag = (f: string): f is ModerationFlag => FLAGS.has(f);
const ACTOR = "Moderação";

export interface QueueCase {
  id: string;
  reason: "guest_pin" | "prescreen";
  flags: ModerationFlag[];
  /** The item's opaque handle: the only thing about the author a moderator sees. */
  handle: string;
  /** Earlier refusals of the same author's posts, never who they are. */
  priorRefusals: number;
  item: Item;
  contest: { text: string; at: string } | null;
  decided: { status: string; note: string | null } | null;
  /** This moderator made the decision being contested: someone else judges the contest. */
  decidedByYou: boolean;
}

/** Open cases and open contests, for the moderator's bairros, never their own posts. */
export const getModerationQueue = createServerFn({ method: "GET" }).handler(async (): Promise<QueueCase[] | null> => {
  const user = (await getSession())?.user;
  const mod = user ? await moderatorOf(user.id) : null;
  if (!user || !mod) return null;
  const rows = await db
    .select({ c: moderationCases, neighborhood: items.neighborhood, handle: items.moderationHandle })
    .from(moderationCases)
    .innerJoin(items, eq(items.id, moderationCases.itemId))
    .where(or(eq(moderationCases.status, "open"), eq(moderationCases.contestStatus, "open")))
    .orderBy(desc(moderationCases.createdAt))
    .limit(50);
  const own = new Set(
    (await db.select({ id: itemAuthors.itemId }).from(itemAuthors).where(eq(itemAuthors.accountId, user.id))).map(
      (r) => r.id,
    ),
  );
  const mine = rows.filter(
    (r) => !own.has(r.c.itemId) && (!mod.neighborhoods || mod.neighborhoods.includes(r.neighborhood ?? "")),
  );
  return Promise.all(
    mine.map(async ({ c, handle }): Promise<QueueCase> => {
      const [prior] = await db
        .execute<{ n: number }>(
          sql`
        select count(*)::int as n from ${moderationCases} mc
        join ${itemAuthors} a on a.item_id = mc.item_id
        where mc.status in ('rejected', 'republish') and mc.item_id <> ${c.itemId}
          and a.account_id = (select account_id from ${itemAuthors} where item_id = ${c.itemId})`,
        )
        .then((r) => r.rows);
      const item = await findItem(c.itemId);
      if (!item) throw new Error("caso sem registro");
      return {
        id: c.id,
        reason: c.reason,
        flags: c.flags.filter(isFlag),
        handle: handle ?? "—",
        priorRefusals: prior?.n ?? 0,
        item,
        contest:
          c.contestStatus === "open" && c.contestText && c.contestedAt
            ? { text: c.contestText, at: c.contestedAt.toISOString() }
            : null,
        decided: c.status === "open" ? null : { status: c.status, note: c.note },
        decidedByYou: c.decidedBy === user.id,
      };
    }),
  );
});

const DecisionSchema = z.discriminatedUnion("decision", [
  z.object({ caseId: z.uuid(), decision: z.literal("publish") }),
  z.object({ caseId: z.uuid(), decision: z.literal("reject"), note: z.string().trim().min(3).max(280) }),
  z.object({ caseId: z.uuid(), decision: z.literal("republish"), note: z.string().trim().min(3).max(280) }),
]);

const EVENT_TEXT = {
  publish: () => "Publicado após moderação.",
  reject: (note: string) => `Não publicado: ${note}`,
  republish: (note: string) => `Pedido de republicação, assinada com apelido: ${note}`,
};

/** A moderator's decision on an open case, appended to the item's history. */
export const decideCase = createServerFn({ method: "POST" })
  .inputValidator(DecisionSchema)
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = (await getSession())?.user;
    if (!user || !(await isModerator(user.id))) return { ok: false, error: "Só moderadores decidem." };
    const now = new Date();
    return db.transaction(async (tx) => {
      const [c] = await tx.select().from(moderationCases).where(eq(moderationCases.id, data.caseId)).for("update");
      if (!c || c.status !== "open") return { ok: false, error: "Esse caso já foi decidido." };
      const note = data.decision === "publish" ? null : data.note;
      await tx
        .update(moderationCases)
        .set({
          status: data.decision === "publish" ? "published" : data.decision === "reject" ? "rejected" : "republish",
          note,
          decidedBy: user.id,
          decidedAt: now,
        })
        .where(eq(moderationCases.id, c.id));
      await tx
        .update(items)
        .set({ moderation: data.decision === "publish" ? "published" : "rejected", updatedAt: now })
        .where(eq(items.id, c.itemId));
      await tx.insert(itemEvents).values({
        itemId: c.itemId,
        at: now,
        kind: "moderation",
        actor: ACTOR,
        text: data.decision === "publish" ? EVENT_TEXT.publish() : EVENT_TEXT[data.decision](note ?? ""),
      });
      return { ok: true };
    });
  });

/** A contest, judged again: overturned publishes the item, upheld keeps it out. */
export const resolveContest = createServerFn({ method: "POST" })
  .inputValidator(z.object({ caseId: z.uuid(), overturn: z.boolean(), note: z.string().trim().min(3).max(280) }))
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = (await getSession())?.user;
    if (!user || !(await isModerator(user.id))) return { ok: false, error: "Só moderadores decidem." };
    const now = new Date();
    return db.transaction(async (tx) => {
      const [c] = await tx.select().from(moderationCases).where(eq(moderationCases.id, data.caseId)).for("update");
      if (!c || c.contestStatus !== "open") return { ok: false, error: "Essa contestação já foi analisada." };
      // Whoever decided the first time doesn't judge the contest of it.
      if (c.decidedBy === user.id) return { ok: false, error: "Outra pessoa da moderação precisa analisar." };
      await tx
        .update(moderationCases)
        .set({ contestStatus: data.overturn ? "overturned" : "upheld", contestNote: data.note })
        .where(eq(moderationCases.id, c.id));
      if (data.overturn)
        await tx.update(items).set({ moderation: "published", updatedAt: now }).where(eq(items.id, c.itemId));
      await tx.insert(itemEvents).values({
        itemId: c.itemId,
        at: now,
        kind: "moderation",
        actor: ACTOR,
        text: data.overturn
          ? `Contestação aceita: publicado. ${data.note}`
          : `Contestação analisada: a decisão fica. ${data.note}`,
      });
      return { ok: true };
    });
  });

/**
 * The author contests a decision (round 18, Q31). A member through their session; a guest through
 * the pin's tracking key. One open contest per decision.
 */
export const contestDecision = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      itemId: z.string().min(4).max(12),
      key: z.string().max(64).nullable(),
      text: z.string().trim().min(10).max(600),
    }),
  )
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = (await getSession())?.user;
    const [row] = await db.select({ hash: items.trackingKeyHash }).from(items).where(eq(items.id, data.itemId));
    if (!row) return { ok: false, error: "Esse registro não existe." };
    const byKey = Boolean(data.key && row.hash && (await hashKey(data.key)) === row.hash);
    const own =
      user &&
      (
        await db
          .select({ id: itemAuthors.itemId })
          .from(itemAuthors)
          .where(and(eq(itemAuthors.itemId, data.itemId), eq(itemAuthors.accountId, user.id)))
      ).length > 0;
    if (!byKey && !own) return { ok: false, error: "Só quem registrou pode contestar." };
    const [c] = await db
      .select()
      .from(moderationCases)
      .where(
        and(
          eq(moderationCases.itemId, data.itemId),
          inArray(moderationCases.status, ["rejected", "republish"]),
          isNotNull(moderationCases.decidedAt),
        ),
      )
      .orderBy(desc(moderationCases.decidedAt))
      .limit(1);
    if (!c) return { ok: false, error: "Não há decisão para contestar." };
    if (c.contestStatus) return { ok: false, error: "Esta decisão já foi contestada." };
    await db
      .update(moderationCases)
      .set({ contestText: data.text, contestedAt: new Date(), contestStatus: "open" })
      .where(eq(moderationCases.id, c.id));
    return { ok: true };
  });

/** For the item page: the latest decision on a held or refused item, and whether it can still be contested. */
export const getDecision = createServerFn({ method: "GET" })
  .inputValidator(z.string().min(4).max(12))
  .handler(async ({ data }) => {
    const [c] = await db
      .select({ status: moderationCases.status, note: moderationCases.note, contest: moderationCases.contestStatus })
      .from(moderationCases)
      .where(and(eq(moderationCases.itemId, data), ne(moderationCases.status, "open")))
      .orderBy(desc(moderationCases.decidedAt))
      .limit(1);
    return c ?? null;
  });

/** Whether the signed-in person moderates, for the link in Você. */
export const getIsModerator = createServerFn({ method: "GET" }).handler(async () => {
  const who = await member("moderar");
  if ("error" in who) return false;
  return isModerator(who.id);
});
