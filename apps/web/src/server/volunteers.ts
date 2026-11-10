import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { MODERATION_GUIDE_VERSION } from "@/features/moderation/guide-version";
import { db } from "./db/client";
import { moderatorApplications, moderators } from "./db/schema";
import { member, mutedRefusal, type Failure } from "./member";
import { guideCurrent } from "./moderator";
import { getSession } from "./session";

/**
 * Who helps moderate (moderation capacity): a member asks from Você; the operator decides, as with
 * `moderator:add` (`moderator applications|approve|decline`). A moderator accepts the current guide
 * before deciding cases (features/moderation/moderation-guide.tsx). Server functions only: the browser
 * imports this module.
 */

export interface ModerationStanding {
  /** The person moderates: which bairros (null for all), and whether they accepted the current guide. */
  moderator: { neighborhoods: string[] | null; guideCurrent: boolean } | null;
  /** Their latest application, when they don't moderate. */
  application: { status: "pending" | "approved" | "declined"; createdAt: string; neighborhoods: string[] } | null;
}

/** Null for anyone who can't apply: signed out, a guest, or no phone verified. */
export const getModerationStanding = createServerFn({ method: "GET" }).handler(
  async (): Promise<ModerationStanding | null> => {
    const user = (await getSession())?.user;
    if (!user || user.isAnonymous || !user.phoneVerifiedAt) return null;
    const [mod] = await db.select().from(moderators).where(eq(moderators.accountId, user.id));
    if (mod)
      return {
        moderator: { neighborhoods: mod.neighborhoods, guideCurrent: guideCurrent(mod) },
        application: null,
      };
    const [app] = await db
      .select()
      .from(moderatorApplications)
      .where(eq(moderatorApplications.accountId, user.id))
      .orderBy(desc(moderatorApplications.createdAt))
      .limit(1);
    return {
      moderator: null,
      application: app
        ? { status: app.status, createdAt: app.createdAt.toISOString(), neighborhoods: app.neighborhoods }
        : null,
    };
  },
);

const Slug = z.string().refine((s) => canoas.neighborhoods.some((n) => n.slug === s), "Bairro desconhecido.");

export const applyToModerate = createServerFn({ method: "POST" })
  .validator(
    z.object({
      neighborhoods: z.array(Slug).min(1, "Escolha pelo menos um bairro.").max(canoas.neighborhoods.length),
      note: z.string().trim().max(280).optional(),
    }),
  )
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const who = await member("ajudar na moderação");
    if ("error" in who) return who;
    const muted = mutedRefusal(who);
    if (muted) return muted;
    const [mod] = await db
      .select({ id: moderators.accountId })
      .from(moderators)
      .where(eq(moderators.accountId, who.id));
    if (mod) return { ok: false, error: "Você já modera." };
    const [pending] = await db
      .select({ id: moderatorApplications.id })
      .from(moderatorApplications)
      .where(and(eq(moderatorApplications.accountId, who.id), eq(moderatorApplications.status, "pending")));
    if (pending) return { ok: false, error: "Seu pedido já está com a equipe." };
    await db.insert(moderatorApplications).values({
      accountId: who.id,
      neighborhoods: [...new Set(data.neighborhoods)],
      note: data.note || null,
    });
    return { ok: true };
  });

/** The moderator read the current guide and agrees to follow it. */
export const acceptModerationGuide = createServerFn({ method: "POST" }).handler(
  async (): Promise<Failure | { ok: true }> => {
    const user = (await getSession())?.user;
    if (!user) return { ok: false, error: "Entre para continuar." };
    const res = await db
      .update(moderators)
      .set({ guideVersion: MODERATION_GUIDE_VERSION, guideAcceptedAt: new Date() })
      .where(eq(moderators.accountId, user.id))
      .returning({ id: moderators.accountId });
    return res.length ? { ok: true } : { ok: false, error: "Só moderadores aceitam o guia." };
  },
);
