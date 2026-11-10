import { FileText } from "lucide-react";
import { AuthFrame } from "@/components/page-frame";
import type { AppLink } from "@/components/app-link";
import { textLink } from "@/components/text-link";
import type { MonthlyListing } from "@/server/monthly";

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
/** "Setembro de 2026": a capital on the first word only (CSS capitalize would give "De"). */
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * /relatorios: the monthly report per body (core monthly-report.ts), one PDF a month, built on the
 * 1st and never changed. Each body's page can be sent on as it is.
 */
export function MonthlyPage({ back, reports }: { back: AppLink; reports: MonthlyListing[] }) {
  return (
    <AuthFrame back={back} width="read">
      <header className="grid gap-2">
        <h1 className="text-heading font-semibold text-balance">Relatórios mensais</h1>
        <p className="text-ui text-pretty text-ink-2">
          Todo dia 1º, o Fala publica o mês que terminou, por órgão responsável: quantos registros foram à Prefeitura,
          quantos os vizinhos confirmaram como resolvidos, e o que ficou em aberto. Cada órgão tem a sua página, que
          pode ser encaminhada como está. O relatório não muda depois de publicado; o{" "}
          <a href="/placar" className={textLink}>
            placar
          </a>{" "}
          mostra os números de agora.
        </p>
      </header>

      {reports.length ? (
        <ul className="grid gap-3">
          {reports.map((r) => (
            <li key={r.month} className="grid gap-2 rounded-2xl border border-hairline bg-card p-4 shadow-soft">
              <a
                href={`/api/relatorio/${r.month}`}
                className="flex items-baseline justify-between gap-3 font-semibold hover:underline"
              >
                <span className="flex items-center gap-2">
                  <FileText className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden="true" />
                  {sentence(r.label)}
                </span>
                <span className="text-caption font-normal text-muted-foreground">PDF, {kb(r.bytes)}</span>
              </a>
              <p className="text-sm text-pretty text-ink-2">
                {r.totals.sent} enviados à Prefeitura, {r.totals.resolved} resolvidos, {r.totals.openAtEnd} em aberto no
                fim do mês ({r.totals.overDeadlineAtEnd} há mais de {r.deadlineDays} dias). {r.bodies.length}{" "}
                {r.bodies.length === 1 ? "órgão" : "órgãos"}.
              </p>
              <p className="font-mono text-2xs break-all text-muted-foreground">SHA-256 {r.sha256}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-hairline-strong px-4 py-3 text-ui text-pretty text-ink-2">
          Nenhum relatório ainda. O primeiro sai no dia 1º depois que os primeiros registros reais forem à Prefeitura.
        </p>
      )}

      <p className="text-caption text-pretty text-muted-foreground">
        Os números contam como o placar: registros confirmados por pelo menos um vizinho, com os dias a partir do envio
        à Prefeitura no resumo diário. O código SHA-256 permite conferir que uma cópia é a original.
      </p>
    </AuthFrame>
  );
}
