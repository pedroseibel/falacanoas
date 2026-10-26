import { cron } from "@elysiajs/cron";
import { canoas } from "@fala/instance-canoas";
import { Elysia } from "elysia";
import { loadConfig } from "./config";
import type { RunResult } from "./run";
import type { RainResult } from "./rain";
import { digestNow, monthlyNow, rainNow, replyNow, type MonthlyOutcome } from "./service";

/**
 * The daily digest to the Ouvidoria (DECISIONS round 5; BUILD 3.1): every day at the instance's
 * digest hour, the reports published since the last one, in one e-mail. Development writes the
 * e-mail to outbox/ and doesn't schedule itself (run `bun run agora`), so a dev server left running
 * never starts real reports' clocks.
 */

const config = loadConfig();
let last: { at: string; result: RunResult } | null = null;

async function run(trigger: string) {
  const at = new Date();
  const result = await digestNow(config, at).catch((e): RunResult => ({ ok: false, error: "send", detail: String(e) }));
  last = { at: at.toISOString(), result };
  console.log(JSON.stringify({ digest: trigger, at: last.at, ...result }));
  return result;
}

const pattern = `0 ${canoas.digestHour} * * *`;
/** The monthly report per body: the 1st at 08h, for the month that just ended. */
const monthly = "0 8 1 * *";

async function runMonthly(trigger: string, month?: string) {
  const outcome = await monthlyNow(config, new Date(), month).catch((e): MonthlyOutcome => ({
    ok: false,
    month: month ?? "",
    error: "invalid",
    detail: String(e),
  }));
  const { pdf: _pdf, ...shown } = outcome.ok ? outcome : { ...outcome, pdf: null };
  console.log(JSON.stringify({ mensal: trigger, ...shown }));
  return shown;
}

const scheduled = config.mode === "production";

/** The rain archive (BUILD 6.1): Cemaden's gauges every 10 minutes, a little after they report. */
const rainPattern = "2-59/10 * * * *";
let lastRain: { at: string; result: RainResult } | null = null;

async function runRain() {
  const at = new Date();
  const result = await rainNow(config, at).catch((e): RainResult => ({ ok: false, error: "fetch", detail: String(e) }));
  lastRain = { at: at.toISOString(), result };
  if (!result.ok || result.missing.length) console.log(JSON.stringify({ chuva: "cron", at: lastRain.at, ...result }));
}

new Elysia()
  .use(cron({ name: "resumo", pattern, timezone: canoas.timezone, paused: !scheduled, run: () => run("cron") }))
  .use(
    cron({
      name: "mensal",
      pattern: monthly,
      timezone: canoas.timezone,
      paused: !scheduled,
      run: () => void runMonthly("cron"),
    }),
  )
  .use(cron({ name: "chuva", pattern: rainPattern, timezone: canoas.timezone, paused: !config.rain, run: runRain }))
  .get("/saude", ({ store }) => ({
    mode: config.mode,
    schedule: scheduled ? `${pattern} (${canoas.timezone})` : null,
    next: scheduled ? (store.cron.resumo.nextRun()?.toISOString() ?? null) : null,
    monthly: scheduled ? (store.cron.mensal.nextRun()?.toISOString() ?? null) : null,
    last,
    rain: config.rain ? { next: store.cron.chuva.nextRun()?.toISOString() ?? null, last: lastRain } : null,
  }))
  .post("/resumo", async ({ headers, status }) => {
    if (!config.token || headers.authorization !== `Bearer ${config.token}`) return status(401, "Não autorizado.");
    const result = await run("manual");
    if (result.ok) return result;
    return status(result.error === "busy" ? 409 : 502, result);
  })
  // The monthly report by hand: the month that just ended, or ?mes=AAAA-MM. Built once.
  .post("/mensal", async ({ headers, query, status }) => {
    if (!config.token || headers.authorization !== `Bearer ${config.token}`) return status(401, "Não autorizado.");
    const shown = await runMonthly("manual", typeof query.mes === "string" ? query.mes : undefined);
    return shown.ok ? shown : status(shown.error === "built" ? 409 : shown.error === "empty" ? 404 : 400, shown);
  })
  // Answers to the resumo, as raw e-mail (message/rfc822), from whatever receives mail for the sender
  // address (BUILD 3.1): protocols are read and, when safe, applied (replies.ts).
  .post(
    "/respostas",
    async ({ headers, request, status }) => {
      if (!config.repliesToken || headers.authorization !== `Bearer ${config.repliesToken}`)
        return status(401, "Não autorizado.");
      const raw = new Uint8Array(await request.arrayBuffer());
      if (!raw.byteLength || raw.byteLength > 25 * 1024 * 1024) return status(413, "E-mail vazio ou grande demais.");
      const outcome = await replyNow(config, raw);
      console.log(
        JSON.stringify({
          resposta: outcome.kind,
          ...(outcome.kind === "recorded" ? { id: outcome.id, status: outcome.status, applied: outcome.applied } : {}),
        }),
      );
      return outcome.kind === "recorded"
        ? { id: outcome.id, status: outcome.status, applied: outcome.applied }
        : outcome;
    },
    { parse: "none" },
  )
  .listen(config.port);

console.log(`resumo diário (${config.mode}) em :${config.port}`);
