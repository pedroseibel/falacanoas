import { DAY_MS, MUTE_DAYS, type SanctionKind, STRIKE_WINDOW_DAYS, SUSPEND_DAYS } from "@fala/core";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNotNull, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { moderationCases, sanctions } from "./db/schema";
import type { Failure } from "./member";
import { targetAccount } from "./case-target";
import { sessionModerator } from "./moderator";
import { removalsOf, type SanctionRow } from "./sanctions-store";
import { getSession } from "./session";

/**
 * Mutes and suspensions (DECISIONS round 19). The person sanctioned sees why on Você and can contest
 * once; moderators see each sanction by its own code, never by who it is. A moderator mutes for 30
 * days; a suspension a moderator proposes waits for another to confirm; permanent ones are the
 * controller's alone (`bun --filter @fala/web sanction`).
 */

const iso = (d: Date | null) => d?.toISOString() ?? null;

export interface MySanction {
  id: string;
  kind: SanctionKind;
  reason: string;
  until: string | null;
  contest: "open" | "upheld" | "overturned" | null;
}

export const getMySanctions = createServerFn({ method: "GET" }).handler(async (): Promise<MySanction[]> => {
  const user = (await getSession())?.user;
  if (!user || user.isAnonymous) return [];
  const now = new Date();
  const rows = await db.select().from(sanctions).where(eq(sanctions.accountId, user.id));
  return rows
    .filter((r) => r.confirmedAt && !r.liftedAt && r.startsAt <= now && (!r.endsAt || r.endsAt > now))
    .map((r) => ({ id: r.id, kind: r.kind, reason: r.reason, until: iso(r.endsAt), contest: r.contestStatus }));
});

/** The person contests a sanction, once; someone other than whoever gave it reviews. */
export const contestSanction = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), text: z.string().trim().min(10).max(600) }))
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = (await getSession())?.user;
    if (!user) return { ok: false, error: "Entre para contestar." };
    const [row] = await db
      .select()
      .from(sanctions)
      .where(and(eq(sanctions.id, data.id), eq(sanctions.accountId, user.id)));
    if (!row) return { ok: false, error: "Essa sanção não existe." };
    if (row.contestStatus) return { ok: false, error: "Essa sanção já foi contestada." };
    await db
      .update(sanctions)
      .set({ contestText: data.text, contestedAt: new Date(), contestStatus: "open" })
      .where(eq(sanctions.id, row.id));
    return { ok: true };
  });

async function moderator(): Promise<{ id: string } | Failure> {
  return (await sessionModerator()) ?? { ok: false, error: "Só moderadores decidem." };
}

/**
 * From a case: mute whoever sent its content for 30 days, or propose suspending them for 90 (a second
 * moderator confirms). The reason goes to the person, never to the public.
 */
export const sanctionFromCase = createServerFn({ method: "POST" })
  .validator(
    z.object({ caseId: z.uuid(), kind: z.enum(["mute", "suspend"]), reason: z.string().trim().min(3).max(280) }),
  )
  .handler(async ({ data }): Promise<Failure | { ok: true; proposed: boolean }> => {
    const mod = await moderator();
    if ("error" in mod) return mod;
    const [c] = await db.select().from(moderationCases).where(eq(moderationCases.id, data.caseId));
    if (!c) return { ok: false, error: "Esse caso não existe." };
    const accountId = await targetAccount(db, c);
    if (!accountId) return { ok: false, error: "Não há conta ligada a esse conteúdo." };
    if (accountId === mod.id) return { ok: false, error: "Outra pessoa da moderação precisa decidir." };
    const now = new Date();
    const mute = data.kind === "mute";
    await db.insert(sanctions).values({
      accountId,
      kind: data.kind,
      source: "moderator",
      reason: data.reason,
      startsAt: now,
      endsAt: new Date(now.getTime() + (mute ? MUTE_DAYS : SUSPEND_DAYS) * DAY_MS),
      createdBy: mod.id,
      ...(mute ? { confirmedAt: now, confirmedBy: mod.id } : {}),
    });
    return { ok: true, proposed: !mute };
  });

export interface QueueSanction {
  id: string;
  /** The sanction's own code: moderators never see whose it is. */
  handle: string;
  kind: SanctionKind;
  source: SanctionRow["source"];
  reason: string;
  until: string | null;
  /** Removals of this person's posts in the last 30 days. */
  recentRemovals: number;
  /** A suspension waiting for a second moderator, or a contest waiting for review. */
  waiting: "confirmation" | "contest";
  contest: { text: string; at: string } | null;
}

/** Suspensions to confirm and contested sanctions, never ones this moderator gave. */
export const getSanctionQueue = createServerFn({ method: "GET" }).handler(async (): Promise<QueueSanction[] | null> => {
  const mod = await moderator();
  if ("error" in mod) return null;
  const rows = await db
    .select()
    .from(sanctions)
    .where(
      and(
        isNull(sanctions.liftedAt),
        or(and(isNull(sanctions.confirmedAt), eq(sanctions.kind, "suspend")), eq(sanctions.contestStatus, "open")),
        or(isNull(sanctions.createdBy), ne(sanctions.createdBy, mod.id)),
        ne(sanctions.accountId, mod.id),
        // A suspension that came with an escalation is the controller's to review, never volunteers'.
        isNull(sanctions.escalationId),
      ),
    )
    .orderBy(desc(sanctions.createdAt))
    .limit(50);
  const since = new Date(Date.now() - STRIKE_WINDOW_DAYS * DAY_MS);
  return Promise.all(
    rows.map(async (r): Promise<QueueSanction> => ({
      id: r.id,
      handle: r.id.slice(0, 8),
      kind: r.kind,
      source: r.source,
      reason: r.reason,
      until: iso(r.endsAt),
      recentRemovals: (await removalsOf(db, r.accountId, since)).filter((x) => x.weight !== "none").length,
      waiting: r.confirmedAt ? "contest" : "confirmation",
      contest:
        r.contestStatus === "open" && r.contestText && r.contestedAt
          ? { text: r.contestText, at: r.contestedAt.toISOString() }
          : null,
    })),
  );
});

/** A second moderator confirms a proposed suspension (it starts now, for 90 days) or declines it. */
export const decideSuspension = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), confirm: z.boolean(), note: z.string().trim().max(280).optional() }))
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const mod = await moderator();
    if ("error" in mod) return mod;
    const [row] = await db.select().from(sanctions).where(eq(sanctions.id, data.id));
    if (!row || row.kind !== "suspend" || row.confirmedAt || row.liftedAt)
      return { ok: false, error: "Essa suspensão já foi decidida." };
    if (row.createdBy === mod.id || row.accountId === mod.id)
      return { ok: false, error: "Outra pessoa da moderação precisa confirmar." };
    const now = new Date();
    await db
      .update(sanctions)
      .set(
        data.confirm
          ? {
              confirmedAt: now,
              confirmedBy: mod.id,
              startsAt: now,
              endsAt: new Date(now.getTime() + SUSPEND_DAYS * DAY_MS),
            }
          : { liftedAt: now, liftedBy: mod.id, liftNote: data.note || "Suspensão não confirmada." },
      )
      .where(eq(sanctions.id, row.id));
    return { ok: true };
  });

/** A contested sanction, reviewed by someone other than whoever gave it: lifted, or kept. */
export const resolveSanctionContest = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), lift: z.boolean(), note: z.string().trim().min(3).max(280) }))
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const mod = await moderator();
    if ("error" in mod) return mod;
    const [row] = await db
      .select()
      .from(sanctions)
      .where(
        and(
          eq(sanctions.id, data.id),
          eq(sanctions.contestStatus, "open"),
          isNotNull(sanctions.confirmedAt),
          isNull(sanctions.escalationId),
        ),
      );
    if (!row) return { ok: false, error: "Essa contestação já foi analisada." };
    if (row.createdBy === mod.id || row.confirmedBy === mod.id || row.accountId === mod.id)
      return { ok: false, error: "Outra pessoa da moderação precisa analisar." };
    const now = new Date();
    await db
      .update(sanctions)
      .set({
        contestStatus: data.lift ? "overturned" : "upheld",
        contestNote: data.note,
        ...(data.lift ? { liftedAt: now, liftedBy: mod.id, liftNote: data.note } : {}),
      })
      .where(eq(sanctions.id, row.id));
    return { ok: true };
  });
