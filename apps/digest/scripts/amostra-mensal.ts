import { monthlyReport, type MonthlyRow } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderMonthly } from "../src/pdf/monthly";

/**
 * `bun run amostra-mensal`: the monthly report's PDF from the fictional demo data, to see the layout
 * without a database. Every page says it's a sample. The fixtures carry ages ("43 dias"), not dates:
 * each is placed back from a fixed "now" so September reads as a plausible month.
 */
const now = new Date("2026-10-01T11:00:00Z"); // 08h in Canoas, the 1st: when the real one runs
const DAY = 86_400_000;
const rows: MonthlyRow[] = fixtures.items
  .filter((it) => it.kind === "occurrence")
  .map((it) => {
    const end = now.getTime() - (it.updatedMinutesAgo % (20 * 24 * 60)) * 60_000;
    const resolved = it.community === "resolved";
    const sent = resolved ? end - it.days * DAY : now.getTime() - it.days * DAY;
    return {
      id: it.id,
      category: it.category,
      neighborhood: it.neighborhood,
      confirmations: it.confirmations,
      guest: Boolean(it.guest),
      sentAt: new Date(sent),
      closedAt: resolved ? new Date(end) : null,
      protocolAt: it.official ? new Date(sent + DAY) : null,
    };
  });
const report = monthlyReport(rows, canoas, { year: 2026, month: 9 });
const pdf = await renderMonthly(report, { muni: canoas, generatedAt: now, sample: true });
const out = fileURLToPath(new URL("../outbox/", import.meta.url));
mkdirSync(out, { recursive: true });
writeFileSync(`${out}amostra-mensal.pdf`, pdf);
console.log(
  `${out}amostra-mensal.pdf · ${report.bodies.length} órgãos · ${report.totals.sent} enviados · ${(pdf.byteLength / 1024).toFixed(0)} KB`,
);
