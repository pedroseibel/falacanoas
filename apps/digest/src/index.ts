import { cron } from "@elysiajs/cron";
import { canoas } from "@fala/instance-canoas";
import { Elysia } from "elysia";
import { loadConfig } from "./config";
import type { RunResult } from "./run";
import { digestNow, replyNow } from "./service";

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

const scheduled = config.mode === "production";

new Elysia()
  .use(cron({ name: "resumo", pattern, timezone: canoas.timezone, paused: !scheduled, run: () => run("cron") }))
  .get("/saude", ({ store }) => ({
    mode: config.mode,
    schedule: scheduled ? `${pattern} (${canoas.timezone})` : null,
    next: scheduled ? (store.cron.resumo.nextRun()?.toISOString() ?? null) : null,
    last,
  }))
  .post("/resumo", async ({ headers, status }) => {
    if (!config.token || headers.authorization !== `Bearer ${config.token}`) return status(401, "Não autorizado.");
    const result = await run("manual");
    if (result.ok) return result;
    return status(result.error === "busy" ? 409 : 502, result);
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
