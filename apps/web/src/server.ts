import { canoas } from "@fala/instance-canoas";
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { lt } from "drizzle-orm";
import { openDb } from "./server/db/client";
import { rateLimits } from "./server/db/schema";
import { closeQuietItems } from "./server/items";

/**
 * The Worker: TanStack Start's handler for requests, plus the daily job (wrangler.jsonc, triggers):
 * pins someone said were fixed close on their own after 15 days without dispute (round 4), and
 * rate-limit rows, which Better Auth keys by IP and never deletes, go once a day old (the longest
 * window is 15 minutes).
 */
const fetch = createStartHandler(defaultStreamHandler);

async function daily(now: Date): Promise<void> {
  const { db, close } = await openDb();
  try {
    const closed = await closeQuietItems(db, now, canoas.branding.name);
    const limits = await db.delete(rateLimits).where(lt(rateLimits.lastRequest, now.getTime() - 86_400_000));
    console.info(
      `diário: ${closed} registros fechados por 15 dias sem contestação; ${limits.rowCount ?? 0} limites antigos apagados`,
    );
  } finally {
    await close();
  }
}

export default {
  fetch,
  scheduled(_controller: unknown, _env: unknown, ctx: { waitUntil: (p: Promise<unknown>) => void }) {
    ctx.waitUntil(daily(new Date()));
  },
};
