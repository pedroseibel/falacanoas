import { monthKey, monthlyReport, parseMonth, previousMonth, siteUrl } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createHash } from "node:crypto";
import { ADDRESSEE, type Config } from "./config";
import { fileOutbox, noOutbox } from "./outbox";
import { renderMonthly } from "./pdf/monthly";
import { sitePhotos } from "./pdf/photos";
import { renderPdf } from "./pdf/render";
import { openFreeMap } from "./pdf/tiles";
import { archiveRain, pgRainStore, type RainResult } from "./rain";
import { readMail, takeReply, type ReplyOutcome, type Senders } from "./replies";
import { runDigest, type RunResult } from "./run";
import { pgMonthlyStore, pgReplyStore, pgStore } from "./store";

export async function digestNow(config: Config, now = new Date()): Promise<RunResult> {
  const store = pgStore(config.databaseUrl, canoas.branding.name, canoas.timezone, canoas);
  const tiles = openFreeMap(config.cacheDir);
  const photos = sitePhotos(siteUrl(canoas), config.photoBase);
  try {
    return await runDigest(
      {
        store,
        outbox: config.mode === "development" ? fileOutbox(config.outboxDir) : noOutbox,
        muni: canoas,
        recipients: { from: config.from, to: config.to, cc: config.cc },
        pdf: (doc) => renderPdf(doc, { muni: canoas, tiles, photos, addressee: ADDRESSEE, sentAt: now }),
      },
      now,
    );
  } finally {
    await store.close();
  }
}

export const senders = (config: Config): Senders => ({ to: config.to, cc: config.cc, names: ADDRESSEE });

export async function replyNow(
  config: Config,
  raw: string | Uint8Array,
  { operator = false }: { operator?: boolean } = {},
): Promise<ReplyOutcome> {
  const store = pgReplyStore(config.databaseUrl, canoas.branding.name, canoas.timezone);
  try {
    return await takeReply(store, senders(config), await readMail(raw, config.authserv), { operator });
  } finally {
    await store.close();
  }
}

export type MonthlyOutcome =
  | { ok: true; month: string; bodies: number; bytes: number; pdf: Uint8Array }
  | { ok: false; month: string; error: "built" | "empty" | "invalid"; detail?: string };

/**
 * The monthly report for `month` ("2026-10"; by default the one that just ended), built once and kept.
 * A month with nothing sent to the Prefeitura, before or during it, has nothing to report.
 */
export async function monthlyNow(config: Config, now = new Date(), month?: string): Promise<MonthlyOutcome> {
  const period = month ? parseMonth(month) : previousMonth(now, canoas.timezone);
  if (!period) return { ok: false, month: month ?? "", error: "invalid" };
  const key = monthKey(period);
  // A report is built once and kept: a month that hasn't ended would be frozen half-way.
  if (key > monthKey(previousMonth(now, canoas.timezone))) return { ok: false, month: key, error: "invalid" };
  const store = pgMonthlyStore(config.databaseUrl);
  try {
    if (await store.built(key)) return { ok: false, month: key, error: "built" };
    const report = monthlyReport(await store.rows(), canoas, period);
    if (!report.bodies.length) return { ok: false, month: key, error: "empty" };
    const pdf = await renderMonthly(report, { muni: canoas, generatedAt: now });
    const sha256 = createHash("sha256").update(pdf).digest("hex");
    if (!(await store.keep({ report, generatedAt: now, pdf, sha256 })))
      return { ok: false, month: key, error: "built" };
    return { ok: true, month: key, bodies: report.bodies.length, bytes: pdf.byteLength, pdf };
  } finally {
    await store.close();
  }
}

export async function rainNow(config: Config, now = new Date()): Promise<RainResult> {
  if (!canoas.rain) return { ok: false, error: "feed", detail: "a instância não tem pluviômetros" };
  const store = pgRainStore(config.databaseUrl);
  try {
    return await archiveRain(canoas.rain, { fetch, store }, now);
  } finally {
    await store.close();
  }
}
