import type { Municipality } from "@fala/core";
import type { ReactNode } from "react";
import { DaysMeter } from "@/components/viz";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fn, Num, Panel, SecHead, Section, Stage } from "./bits";
import { BOARD_BY_AGENCY, BOARD_BY_TYPE, bairrosByQueue, fmt } from "./landing-model";

/** The caption under each reading. Not a <caption>: it sits below the mobile list too. */
function Note({ children }: { children: ReactNode }) {
  return (
    <p className="border-t border-hairline px-4.5 pt-3 pb-3.5 text-xs text-muted-foreground max-compact:px-4">
      {children}
    </p>
  );
}

/** Each reading is a table on wide screens and a stacked list on phones (same content, one shown). */
function ByType() {
  return (
    <>
      <div className="max-compact:hidden">
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Mediana até o conserto</TableHead>
              <TableHead className="text-right">Dias</TableHead>
              <TableHead className="text-right">Resolvidos em 30 dias</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {BOARD_BY_TYPE.map((r) => (
              <TableRow key={r.label}>
                <TableCell>
                  <span className="font-medium text-foreground">{r.label}</span>
                </TableCell>
                <TableCell className="min-w-45">
                  <DaysMeter days={r.days} />
                </TableCell>
                <TableCell className="text-right">
                  <Num className="text-foreground">{r.days}</Num>
                </TableCell>
                <TableCell className="text-right">
                  <Num className="text-foreground">{r.within}%</Num>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="compact:hidden">
        {BOARD_BY_TYPE.map((r) => (
          <li
            key={r.label}
            className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-hairline px-4 py-3.25 text-sm first:border-t-0"
          >
            <span className="basis-full font-medium">{r.label}</span>
            <span className="min-w-0 flex-1">
              <DaysMeter days={r.days} />
            </span>
            <span>
              <Num>{r.days}</Num> <span className="text-caption text-muted-foreground">dias</span>
            </span>
            <span className="basis-full text-caption text-ink-2">
              <Num>{r.within}%</Num> <span className="text-muted-foreground">resolvidos em 30 dias</span>
            </span>
          </li>
        ))}
      </ul>
      <Note>
        Dados fictícios, só para mostrar o formato. A marca de 30 dias é uma referência: é o prazo que a lei dá para a
        Ouvidoria responder uma manifestação, prorrogável por mais 30.
        <Fn n={3} />
      </Note>
    </>
  );
}

function ByAgency() {
  return (
    <>
      <div className="max-compact:hidden">
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>Órgão responsável</TableHead>
              <TableHead>Tipos de problema</TableHead>
              <TableHead className="text-right">Mediana</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {BOARD_BY_AGENCY.map((r) => (
              <TableRow key={r.agency}>
                <TableCell>
                  <span className="font-medium text-foreground">{r.agency}</span>
                </TableCell>
                <TableCell>
                  <span className="text-ink-2">{r.types}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Num className="text-muted-foreground">—</Num>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="compact:hidden">
        {BOARD_BY_AGENCY.map((r) => (
          <li
            key={r.agency}
            className="flex items-center justify-between gap-3.5 border-t border-hairline px-4 py-3.25 text-sm first:border-t-0"
          >
            <span className="grid gap-0.5">
              <span className="font-medium text-foreground">{r.agency}</span>
              <span className="text-caption text-muted-foreground">{r.types}</span>
            </span>
            <Num className="text-muted-foreground">—</Num>
          </li>
        ))}
      </ul>
      <Note>A contagem por órgão começa quando o primeiro bairro abrir. Até lá, nenhum número.</Note>
    </>
  );
}

const goal = (t: number | null) => (t ? fmt(t) : "com o 1º bairro");

function ByBairro({ muni, confirmed }: { muni: Municipality; confirmed: Record<string, number> }) {
  const rows = bairrosByQueue(muni.neighborhoods);
  return (
    <>
      <div className="max-compact:hidden">
        <Table density="comfortable">
          <TableHeader>
            <TableRow>
              <TableHead>Bairro</TableHead>
              <TableHead className="text-right">Na fila</TableHead>
              <TableHead className="text-right">Para abrir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.slug}>
                <TableCell>
                  <span className="font-medium text-foreground">{b.name}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Num className="text-foreground">{fmt(confirmed[b.slug] ?? 0)}</Num>
                </TableCell>
                <TableCell className="text-right">
                  <Num className="text-foreground">{goal(b.threshold)}</Num>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="compact:hidden">
        {rows.map((b) => (
          <li
            key={b.slug}
            className="flex items-center gap-3.5 border-t border-hairline px-4 py-3.25 text-sm first:border-t-0"
          >
            <span className="flex-1 font-medium">{b.name}</span>
            <span>
              <Num>{fmt(confirmed[b.slug] ?? 0)}</Num>{" "}
              <span className="text-caption text-muted-foreground">na fila</span>
            </span>
            <span>
              <span className="text-caption text-muted-foreground">de </span>
              <Num>{goal(b.threshold)}</Num>
            </span>
          </li>
        ))}
      </ul>
      <Note>Este é real: a fila de inscritos confirmados em cada bairro, agora.</Note>
    </>
  );
}

export function Scoreboard({ muni, confirmed }: { muni: Municipality; confirmed: Record<string, number> }) {
  return (
    <Section id="placar" divided>
      <SecHead id="placar" title="O placar mede órgãos, nunca pessoas.">
        Três leituras, atualizadas todo dia: quanto cada tipo de problema demora, quanto cada órgão leva do envio ao
        conserto confirmado e onde os problemas se acumulam. Sempre a mediana, e só com pelo menos 20 registros nos
        últimos seis meses.
      </SecHead>
      <Stage className="p-proof max-compact:p-3.5">
        <Panel>
          <Tabs defaultValue="tipo">
            <div className="border-b border-hairline px-3 py-2.5">
              <TabsList aria-label="Leituras do placar">
                <TabsTrigger value="tipo">
                  <span>
                    Por tipo<span className="max-compact:hidden"> de problema</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="orgao">Por órgão</TabsTrigger>
                <TabsTrigger value="bairro">Por bairro</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="tipo">
              <ByType />
            </TabsContent>
            <TabsContent value="orgao">
              <ByAgency />
            </TabsContent>
            <TabsContent value="bairro">
              <ByBairro muni={muni} confirmed={confirmed} />
            </TabsContent>
          </Tabs>
        </Panel>
      </Stage>
    </Section>
  );
}
