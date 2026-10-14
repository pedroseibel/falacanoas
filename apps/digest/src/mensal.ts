import { mkdirSync, writeFileSync } from "node:fs";
import { loadConfig } from "./config";
import { monthlyNow } from "./service";

/**
 * `bun run mensal [AAAA-MM]`: builds the monthly report per body for that month (by default the one
 * that just ended) and keeps it, public at /relatorios. Once per month: a month already built stays as
 * it was. In development a copy also lands in outbox/. `bun run amostra-mensal` shows the layout with
 * fictional data.
 */
const [month] = process.argv.slice(2);
const config = loadConfig();
const outcome = await monthlyNow(config, new Date(), month);
if (!outcome.ok) {
  console.error(
    {
      built: `O relatório de ${outcome.month} já existe e não muda.`,
      empty: `Nada a relatar em ${outcome.month}: nenhum registro real foi enviado à Prefeitura até lá.`,
      invalid: "Uso: bun run mensal [AAAA-MM]",
    }[outcome.error],
  );
  process.exit(1);
}
console.log(`Relatório de ${outcome.month}: ${outcome.bodies} órgãos, ${(outcome.bytes / 1024).toFixed(0)} KB.`);
if (config.mode === "development") {
  mkdirSync(config.outboxDir, { recursive: true });
  writeFileSync(`${config.outboxDir}/relatorio-mensal-${outcome.month}.pdf`, outcome.pdf);
}
