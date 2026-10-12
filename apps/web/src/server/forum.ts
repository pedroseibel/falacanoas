import { prescreen, refusalFor, refusedInUpdates, type Thread } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { items, postReports, posts, threads } from "./db/schema";
import { boardThreads, pinThread } from "./forum-store";
import { member, type Failure } from "./member";
import { isModerator, moderatorOf } from "./moderation-store";
import { markNickPublished } from "./nicks";
import { getSession } from "./session";
import { recordEvidence } from "./vault";

/**
 * The forum (DECISIONS round 5): a board per bairro, and a conversation under each pin. Signed with
 * the apelido; the pre-screen refuses personal data, insults and named people before anything is
 * posted, and anyone signed in can report a post to the bairro's moderators.
 */

const Slug = z.string().min(1).max(60);
const Text = z.string().trim().min(2).max(600);

const screened = (text: string): Failure | null => {
  const refused = refusedInUpdates(prescreen(text, { electoral: false }));
  return refused.length ? { ok: false, error: refusalFor(refused) } : null;
};

export const getThreads = createServerFn({ method: "GET" })
  .inputValidator(Slug)
  .handler(({ data }) => boardThreads(data));

export const getPinThread = createServerFn({ method: "GET" })
  .inputValidator(z.string().min(4).max(12))
  .handler(({ data }) => pinThread(data.toUpperCase()));

export const startThread = createServerFn({ method: "POST" })
  .inputValidator(z.object({ neighborhood: Slug, title: z.string().trim().min(8).max(160) }))
  .handler(async ({ data }): Promise<Failure | { ok: true; threads: Thread[] }> => {
    const who = await member("conversar");
    if ("error" in who) return who;
    if (!canoas.neighborhoods.some((n) => n.slug === data.neighborhood))
      return { ok: false, error: "Bairro desconhecido." };
    const refused = screened(data.title);
    if (refused) return refused;
    await db
      .insert(threads)
      .values({ neighborhood: data.neighborhood, title: data.title, authorNick: who.nick, accountId: who.id });
    await markNickPublished(who.id);
    await recordEvidence("comment", who.id, null);
    return { ok: true, threads: await boardThreads(data.neighborhood) };
  });

/** A reply on a bairro thread, or under a pin: the pin's conversation starts with its first reply. */
export const replyToThread = createServerFn({ method: "POST" })
  .inputValidator(
    z.union([
      z.object({ threadId: z.uuid(), text: Text }),
      z.object({ itemId: z.string().min(4).max(12), text: Text }),
    ]),
  )
  .handler(async ({ data }): Promise<Failure | { ok: true; thread: Thread }> => {
    const who = await member("conversar");
    if ("error" in who) return who;
    const refused = screened(data.text);
    if (refused) return refused;
    const now = new Date();
    const threadId = await db.transaction(async (tx) => {
      if ("threadId" in data) {
        const [t] = await tx.select({ id: threads.id }).from(threads).where(eq(threads.id, data.threadId));
        return t?.id ?? null;
      }
      const [item] = await tx
        .select({ id: items.id, title: items.title, neighborhood: items.neighborhood, moderation: items.moderation })
        .from(items)
        .where(eq(items.id, data.itemId.toUpperCase()));
      if (!item || item.moderation !== "published") return null;
      const [existing] = await tx.select({ id: threads.id }).from(threads).where(eq(threads.itemId, item.id));
      if (existing) return existing.id;
      const [created] = await tx
        .insert(threads)
        .values({ itemId: item.id, neighborhood: null, title: item.title, authorNick: who.nick, accountId: who.id })
        .returning({ id: threads.id });
      return created?.id ?? null;
    });
    if (!threadId) return { ok: false, error: "Essa conversa não existe mais." };
    await db
      .insert(posts)
      .values({ threadId, text: data.text, authorNick: who.nick, accountId: who.id, createdAt: now });
    await db.update(threads).set({ lastPostAt: now }).where(eq(threads.id, threadId));
    await markNickPublished(who.id);
    await recordEvidence("comment", who.id, "itemId" in data ? data.itemId.toUpperCase() : null);
    const [row] = await db.select().from(threads).where(eq(threads.id, threadId));
    const thread = row?.itemId
      ? await pinThread(row.itemId)
      : row?.neighborhood
        ? (await boardThreads(row.neighborhood)).find((t) => t.id === threadId)
        : null;
    return thread ? { ok: true, thread } : { ok: false, error: "Essa conversa não existe mais." };
  });

/** "Denunciar": a post goes to the moderators. Once per person per post. */
export const reportPost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ postId: z.uuid() }))
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const who = await member("denunciar");
    if ("error" in who) return who;
    await db.insert(postReports).values({ postId: data.postId, reporterId: who.id }).onConflictDoNothing();
    return { ok: true };
  });

export interface ReportedPost {
  id: string;
  text: string;
  by: string;
  threadTitle: string;
  reports: number;
}

/**
 * Reported posts for the moderation page (null for anyone else): the moderator's bairros only,
 * never their own posts.
 */
export const getReportedPosts = createServerFn({ method: "GET" }).handler(async (): Promise<ReportedPost[] | null> => {
  const user = (await getSession())?.user;
  const mod = user ? await moderatorOf(user.id) : null;
  if (!user || !mod) return null;
  const rows = await db
    .select({
      id: posts.id,
      text: posts.text,
      by: posts.authorNick,
      author: posts.accountId,
      threadTitle: threads.title,
      neighborhood: sql<string | null>`coalesce(${threads.neighborhood}, ${items.neighborhood})`,
      reports: sql<number>`count(${postReports.id})::int`,
    })
    .from(postReports)
    .innerJoin(posts, eq(posts.id, postReports.postId))
    .innerJoin(threads, eq(threads.id, posts.threadId))
    .leftJoin(items, eq(items.id, threads.itemId))
    .where(eq(postReports.status, "open"))
    .groupBy(posts.id, threads.id, items.neighborhood)
    .orderBy(desc(sql`count(${postReports.id})`))
    .limit(50);
  return rows
    .filter((r) => r.author !== user.id && (!mod.neighborhoods || mod.neighborhoods.includes(r.neighborhood ?? "")))
    .map(({ id, text, by, threadTitle, reports }) => ({ id, text, by, threadTitle, reports }));
});

/** A moderator hides a reported post (kept, never shown) or keeps it. */
export const decidePost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ postId: z.uuid(), hide: z.boolean() }))
  .handler(async ({ data }): Promise<Failure | { ok: true }> => {
    const user = (await getSession())?.user;
    if (!user || !(await isModerator(user.id))) return { ok: false, error: "Só moderadores decidem." };
    const [post] = await db.select({ author: posts.accountId }).from(posts).where(eq(posts.id, data.postId));
    if (!post) return { ok: false, error: "Essa mensagem não existe mais." };
    if (post.author === user.id) return { ok: false, error: "Outra pessoa da moderação precisa decidir." };
    const now = new Date();
    await db.transaction(async (tx) => {
      if (data.hide) await tx.update(posts).set({ hidden: true }).where(eq(posts.id, data.postId));
      await tx
        .update(postReports)
        .set({ status: data.hide ? "hidden" : "kept", decidedBy: user.id, decidedAt: now })
        .where(and(eq(postReports.postId, data.postId), eq(postReports.status, "open")));
    });
    return { ok: true };
  });
