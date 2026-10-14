import { MONTHS_PT } from "@fala/core";
import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuthFrame, type BackLink } from "@/features/auth/auth-frame";
import { textLink } from "@/features/landing/bits";
import type { MonthCounts, Transparency } from "@/server/transparency";

const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MONTHS_PT[Number(mm) - 1] ?? mm} ${y}`;
};

const hours = (h: number | null) =>
  h === null ? "—" : h < 1 ? "menos de 1 h" : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} dias`;

function Figure({ value, label, note }: { value: ReactNode; label: string; note?: string }) {
  return (
    <div className="grid content-start gap-1 border-t border-hairline pt-3">
      <dd className="text-title leading-none font-semibold">{value}</dd>
      <dt className="text-caption text-ink-2">{label}</dt>
      {note && <p className="text-2xs text-muted-foreground">{note}</p>}
    </div>
  );
}

const COLUMNS: { key: keyof Omit<MonthCounts, "month">; label: string }[] = [
  { key: "photosLooked", label: "Fotos olhadas" },
  { key: "reports", label: "Denúncias" },
  { key: "removals", label: "Remoções" },
  { key: "contests", label: "Contestações" },
  { key: "sanctions", label: "Sanções" },
];

/**
 * /transparencia (DECISIONS round 20; the STF tese on Marco Civil art. 19): what moderation did in the
 * last 12 months, counted live. Only counts, never people or content.
 */
export function TransparencyPage({ back, data }: { back: BackLink; data: Transparency }) {
  const t = data.totals;
  return (
    <AuthFrame back={back} width="read">
      <header className="grid gap-2">
        <h1 className="text-heading font-semibold text-balance">Relatório de transparência</h1>
        <p className="text-ui text-pretty text-ink-2">
          O que a moderação fez nos últimos 12 meses, contado direto do banco de dados do Fala a cada visita. Só
          números: nunca quem publicou, quem denunciou ou o que foi removido.
        </p>
      </header>

      <p className="rounded-xl border border-dashed border-hairline-strong px-4 py-3 text-caption text-ink-2">
        Protótipo: os números vêm do banco de dados de teste. O relatório anual completo sai depois da abertura ao
        público.
      </p>

      <section aria-labelledby="como" className="grid gap-2">
        <h2 id="como" className="text-ui font-semibold">
          Como a moderação funciona
        </h2>
        <ul className="grid list-disc gap-1.5 pl-5 text-ui text-pretty text-ink-2">
          <li>
            Toda foto passa por alguém da moderação antes de aparecer. Uma triagem automática orienta quem modera.
          </li>
          <li>Qualquer pessoa pode denunciar um registro, uma foto ou uma atualização.</li>
          <li>Toda remoção fica no histórico do registro, com o motivo, e quem publicou pode contestar.</li>
          <li>Abuso sexual infantil é removido na hora, preservado e denunciado às autoridades.</li>
          <li>
            As regras que quem modera segue estão no{" "}
            <a href="/moderacao" className={textLink}>
              guia da moderação
            </a>
            , público.
          </li>
        </ul>
      </section>

      <section aria-labelledby="ano" className="grid gap-3">
        <h2 id="ano" className="text-ui font-semibold">
          Nos últimos 12 meses
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Figure
            value={t.photosLooked}
            label="fotos olhadas antes de aparecer"
            note={`${t.photosRemoved} ${t.photosRemoved === 1 ? "removida" : "removidas"}`}
          />
          <Figure value={hours(data.medianFirstLookHours)} label="tempo mediano até a primeira olhada" />
          <Figure value={t.reports} label="denúncias recebidas" />
          <Figure value={t.removals} label="remoções e recusas" />
          <Figure
            value={t.contests}
            label="contestações"
            note={`${t.contestsWon} ${t.contestsWon === 1 ? "aceita" : "aceitas"}`}
          />
          <Figure value={t.sanctions} label="contas silenciadas ou suspensas" />
          <Figure value={t.escalations} label="encaminhamentos de abuso infantil às autoridades" />
          <Figure value={t.dataRequests} label="pedidos de titulares de dados (LGPD)" />
        </dl>
      </section>

      <section aria-labelledby="meses" className="grid gap-3">
        <h2 id="meses" className="text-ui font-semibold">
          Mês a mês
        </h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                {COLUMNS.map((c) => (
                  <TableHead key={c.key} className="text-right">
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.months.toReversed().map((m) => (
                <TableRow key={m.month}>
                  <TableCell>
                    <span className="text-ink-2">{monthLabel(m.month)}</span>
                  </TableCell>
                  {COLUMNS.map((c) => (
                    <TableCell key={c.key} className="text-right">
                      <span className="font-mono tabular-nums">{m[c.key]}</span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-caption text-pretty text-muted-foreground">
          Remoções incluem registros recusados antes de aparecer, fotos e atualizações removidas e registros retirados
          do mapa. Sanções contam silenciamentos automáticos e da moderação e suspensões confirmadas. Gerado em{" "}
          {new Date(data.generatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Veja também o{" "}
          <a href="/privacidade" className={textLink}>
            aviso de privacidade
          </a>
          .
        </p>
      </section>
    </AuthFrame>
  );
}
