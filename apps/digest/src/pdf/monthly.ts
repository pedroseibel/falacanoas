import {
  itemUrl,
  localTime,
  type MonthlyFigures,
  type MonthlyReport,
  MONTHS_FULL_PT,
  type Municipality,
} from "@fala/core";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypst } from "./render";

/**
 * The monthly report per body as a PDF (core monthly-report.ts; pdf/mensal.typ): a first page with
 * every body side by side, then one page per body, so a secretaria's page can be sent on as it is.
 * The words and numbers are decided here, plain and testable; the template only places them.
 */

const TEMPLATE = fileURLToPath(new URL("../../pdf/mensal.typ", import.meta.url));

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const ofTotal = (part: number, whole: number) => (whole ? `${part} de ${whole}` : "—");
const days = (n: number | null, few: string) => (n === null ? few : plural(n, "dia", "dias"));

function facts(f: MonthlyFigures, deadline: number, lastDay: string) {
  return [
    { label: "Enviados à Prefeitura no mês", value: String(f.sent) },
    { label: "Com protocolo recebido", value: ofTotal(f.protocols, f.sent) },
    { label: "Resolvidos no mês, confirmados por vizinhos", value: String(f.resolved) },
    { label: `Resolvidos em até ${deadline} dias`, value: ofTotal(f.resolvedWithinDeadline, f.resolved) },
    { label: "Mediana até resolver", value: days(f.medianDaysToFix, "— (menos de 3 resolvidos)") },
    { label: `Em aberto em ${lastDay}`, value: String(f.openAtEnd) },
    { label: `Em aberto há mais de ${deadline} dias`, value: ofTotal(f.overDeadlineAtEnd, f.openAtEnd) },
  ];
}

function monthlyTemplateData(
  r: MonthlyReport,
  { muni, generatedAt, sample = false }: { muni: Municipality; generatedAt: Date; sample?: boolean },
) {
  const [year, month] = r.month.split("-").map(Number);
  const last = new Date(Date.UTC(year ?? 0, month ?? 1, 0, 12));
  const lastDay = `${last.getUTCDate()}/${String(month).padStart(2, "0")}`;
  const g = localTime(generatedAt, muni.timezone);
  return {
    meta: {
      title: `${muni.branding.name} · Relatório mensal · ${r.label}`,
      sender: muni.branding.name,
      host: muni.branding.domain,
      label: r.label,
      deadline: String(r.deadlineDays),
      sample,
      generated: `${muni.name}, ${g.day === 1 ? "1º" : g.day} de ${MONTHS_FULL_PT[g.month - 1]} de ${g.year}.`,
      headline: `O que os moradores de ${muni.name} registraram em ${r.label}, e o que aconteceu, por órgão responsável.`,
      lede: `Cada registro vai à Prefeitura no resumo diário, com fotos, o lugar e uma página pública. Os dias contam desse envio. Um registro conta como resolvido quando os vizinhos confirmam o conserto, não quando alguém o declara.`,
      stats: [
        { value: String(r.totals.sent), label: "enviados no mês" },
        { value: String(r.totals.resolved), label: "resolvidos no mês" },
        { value: String(r.totals.openAtEnd), label: `em aberto em ${lastDay}` },
        { value: String(r.totals.overDeadlineAtEnd), label: `há mais de ${r.deadlineDays} dias` },
      ],
      method: [
        `Contam nas colunas de resolvidos e em aberto os registros confirmados por pelo menos um vizinho (dois, quando feitos sem conta), como no placar: assim uma pessoa sozinha não muda os números de um órgão. "Enviados" conta todos os registros que foram à Prefeitura no mês.`,
        `O prazo de referência é de ${r.deadlineDays} dias (Lei 13.460/2017, art. 16). A mediana só aparece a partir de três registros resolvidos.`,
        `Cada órgão é o responsável que o ${muni.branding.name} indica para o tipo de problema; a Prefeitura pode encaminhar a outro. O placar ao vivo está em ${muni.branding.domain}/placar.`,
        `Este relatório foi gerado uma vez, depois do fim do mês, e não muda. O ${muni.branding.name} é independente: não é um canal da Prefeitura e não fala por ela.`,
      ],
    },
    summary: r.bodies.map((b, i) => ({
      key: `orgao-${i + 1}`,
      agency: b.agency,
      sent: String(b.sent),
      resolved: String(b.resolved),
      median: b.medianDaysToFix === null ? "—" : String(b.medianDaysToFix),
      open: String(b.openAtEnd),
      over: String(b.overDeadlineAtEnd),
    })),
    totals: {
      sent: String(r.totals.sent),
      resolved: String(r.totals.resolved),
      median: r.totals.medianDaysToFix === null ? "—" : String(r.totals.medianDaysToFix),
      open: String(r.totals.openAtEnd),
      over: String(r.totals.overDeadlineAtEnd),
    },
    bodies: r.bodies.map((b, i) => ({
      key: `orgao-${i + 1}`,
      agency: b.agency,
      facts: facts(b, r.deadlineDays, lastDay),
      oldestTitle: `Há mais tempo em aberto em ${lastDay}`,
      bairrosTitle: `Onde estavam os abertos em ${lastDay}`,
      bairros: b.openByBairro.map((x) => ({
        bairro: x.bairro,
        open: String(x.open),
        over: String(x.overDeadline),
      })),
      oldest: b.oldest.map((o) => ({
        id: o.id,
        category: o.category,
        bairro: o.bairro ?? "—",
        days: plural(o.days, "dia", "dias"),
        url: itemUrl(muni, o.id),
      })),
    })),
  };
}

export async function renderMonthly(
  r: MonthlyReport,
  opts: { muni: Municipality; generatedAt: Date; sample?: boolean },
): Promise<Uint8Array> {
  const dir = mkdtempSync(join(tmpdir(), "mensal-"));
  try {
    return await compileTypst(dir, TEMPLATE, monthlyTemplateData(r, opts), opts.generatedAt);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
