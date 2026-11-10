import { relativeTime, type Thread } from "@fala/core";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db/client";
import { posts, threads } from "./db/schema";

/**
 * The forum's reads (round 5), apart from the server functions in forum.ts: a module the browser
 * imports holds only server functions.
 */

const ago = (at: Date, now: Date) => relativeTime(Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000)));

type ThreadRow = typeof threads.$inferSelect;

async function withReplies(rows: ThreadRow[], now: Date): Promise<Thread[]> {
  if (!rows.length) return [];
  const replies = await db
    .select()
    .from(posts)
    .where(
      and(
        inArray(
          posts.threadId,
          rows.map((t) => t.id),
        ),
        eq(posts.hidden, false),
      ),
    )
    .orderBy(asc(posts.createdAt));
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    by: t.authorNick,
    ago: ago(t.createdAt, now),
    ...(t.itemId ? { pin: t.itemId } : {}),
    ...(t.demo ? { demo: true } : {}),
    replies: replies
      .filter((p) => p.threadId === t.id)
      .map((p) => ({ id: p.id, by: p.authorNick, ago: ago(p.createdAt, now), text: p.text })),
  }));
}

export async function boardThreads(neighborhood: string, now = new Date()): Promise<Thread[]> {
  const rows = await db
    .select()
    .from(threads)
    .where(and(eq(threads.neighborhood, neighborhood), eq(threads.hidden, false)))
    .orderBy(desc(threads.lastPostAt))
    .limit(60);
  return withReplies(rows, now);
}

export async function pinThread(itemId: string, now = new Date()): Promise<Thread | null> {
  const rows = await db
    .select()
    .from(threads)
    .where(and(eq(threads.itemId, itemId), eq(threads.hidden, false)));
  return (await withReplies(rows, now))[0] ?? null;
}
