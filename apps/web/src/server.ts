import { canoas } from "@fala/instance-canoas";
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { lt } from "drizzle-orm";
import { runWith } from "./server/background";
import { openDb } from "./server/db/client";
import { rateLimits } from "./server/db/schema";
import { closeQuietItems } from "./server/items";
import { recheckPending } from "./server/known-material";
import { purgeRemovedPhotos } from "./server/retention";

/**
 * The Worker: TanStack Start's handler for requests, plus the daily job (wrangler.jsonc, triggers):
 * pins someone said were fixed close on their own after 15 days without dispute (round 4);
 * rate-limit rows, which Better Auth keys by IP and never deletes, go once a day old (the longest
 * window is 15 minutes); and removed photos lose their bytes six months after removal (round 20).
 * Every ten minutes, photos still waiting for the known-material check are screened again, and any
 * match is escalated (BUILD 5.8): a photo nobody may see yet shouldn't wait on a single attempt.
 */
const handler = createStartHandler(defaultStreamHandler);

/** Each request runs with its execution context at hand, so work can finish after the response. */
const fetch = (request: Request, _env: unknown, ctx: { waitUntil: (p: Promise<unknown>) => void }) =>
  runWith(ctx, () => handler(request));

async function daily(now: Date): Promise<void> {
  const { db, close } = await openDb();
  try {
    const closed = await closeQuietItems(db, now, canoas.branding.name);
    const limits = await db.delete(rateLimits).where(lt(rateLimits.lastRequest, now.getTime() - 86_400_000));
    const purged = await purgeRemovedPhotos(db, now);
    console.info(
      `diário: ${closed} registros fechados por 15 dias sem contestação; ${limits.rowCount ?? 0} limites antigos apagados; ${purged} fotos removidas há 6 meses apagadas`,
    );
  } finally {
    await close();
  }
}

async function everyTenMinutes(now: Date): Promise<void> {
  const { db, close } = await openDb();
  try {
    const { checked, escalated } = await recheckPending(db, now);
    if (checked || escalated)
      console.info(`verificação: ${checked} fotos verificadas de novo; ${escalated} encaminhadas`);
  } finally {
    await close();
  }
}

export default {
  fetch,
  scheduled(controller: { cron: string }, _env: unknown, ctx: { waitUntil: (p: Promise<unknown>) => void }) {
    ctx.waitUntil(controller.cron === "*/10 * * * *" ? everyTenMinutes(new Date()) : daily(new Date()));
  },
};
