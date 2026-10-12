import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, Num, Panel, SecHead, Section, Stage } from "./bits";
import { reveal } from "./motion";

const RULES: { title: string; body: ReactNode }[] = [
  {
    title: "Crimes e violência",
    body: (
      <>
        Para isso existem a polícia e o <Num className="text-foreground">190</Num>. Ninguém precisa se expor num mapa
        público.
      </>
    ),
  },
  {
    title: "Reclamação contra uma pessoa",
    body: "O mapa aponta serviços e órgãos, nunca alguém pelo nome: nem servidor, nem motorista, nem vizinho.",
  },
  { title: "Briga entre vizinhos", body: "Barulho, obra do lado, cachorro do vizinho: não são serviço público." },
  {
    title: "Emergência",
    body: (
      <>
        Fala, Canoas não é canal de emergência. Defesa Civil: <Num className="text-foreground">199</Num>. Bombeiros:{" "}
        <Num className="text-foreground">193</Num>. Alagamento que volta toda chuva, sim, entra.
      </>
    ),
  },
];

export function Rules() {
  return (
    <Section id="regras" divided>
      <SecHead id="regras" title="O que não entra no mapa.">
        O mapa é para serviços públicos. O resto tem outro lugar.
      </SecHead>
      <dl className="grid grid-cols-2 border-t border-hairline max-compact:grid-cols-1">
        {RULES.map((r) => (
          <div
            key={r.title}
            className="grid content-start gap-1.5 border-b border-hairline pt-6 pb-6.5 odd:pr-rule even:border-l even:pl-rule max-compact:odd:pr-0 max-compact:even:border-l-0 max-compact:even:pl-0"
          >
            <dt className="text-body leading-snug font-semibold tracking-tight">{r.title}</dt>
            <dd className="max-w-copy text-ui text-ink-2">{r.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

const FACTS: [string, string][] = [
  ["Não é da Prefeitura", "Nenhum vínculo com a Prefeitura de Canoas nem com qualquer órgão público."],
  [
    "Sem dinheiro político",
    "Não aceitamos dinheiro de governos, partidos ou candidatos. Por enquanto, os custos são pagos pelo fundador.",
  ],
  [
    "Código aberto",
    "Licença AGPL-3.0. O código vai ficar público em github.com/falacanoas, para qualquer pessoa ler, copiar e melhorar.",
  ],
  [
    "Dados abertos",
    "Quando o mapa abrir, os registros e o placar poderão ser baixados por qualquer pessoa, sem nenhum dado de quem registrou.",
  ],
  [
    "Uma pessoa responde",
    "Pedro Seibel é o responsável pelo projeto e pelos dados da fila. Voluntários são bem-vindos.",
  ],
];

const KEPT: [string, string][] = [
  ["Bairro", "Contar a fila do seu bairro."],
  ["WhatsApp ou e-mail", "Avisar quando seu bairro abrir. Mais nada."],
  ["Como pode ajudar", "Opcional. Organizar quem quer moderar, programar ou divulgar."],
];

export function About() {
  return (
    <Section id="quem-faz" divided>
      <SecHead id="quem-faz" title="Independente, e dá para conferir.">
        Não basta dizer. Estas são as regras do próprio projeto.
      </SecHead>
      <div className="grid grid-cols-pair-wide items-start gap-split max-split:grid-cols-1">
        <dl
          ref={reveal}
          className="grid border-t border-hairline transition duration-1100 ease-fluid data-pre:translate-y-5.5 data-pre:blur-xs"
        >
          {FACTS.map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-aside gap-rule border-b border-hairline py-5 max-compact:grid-cols-1 max-compact:gap-1.5"
            >
              <dt className="font-semibold tracking-tight">{k}</dt>
              <dd className="text-ui text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
        <Stage className="p-proof max-compact:p-3.5">
          <Panel>
            <Bar title="O que guardamos da sua inscrição" />
            <Table density="comfortable">
              <TableHeader>
                <TableRow>
                  <TableHead>Dado</TableHead>
                  <TableHead>Para quê</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {KEPT.map(([k, v]) => (
                  <TableRow key={k}>
                    <TableCell className="w-2/5">
                      <span className="font-medium text-foreground">{k}</span>
                    </TableCell>
                    <TableCell>
                      <span className="whitespace-normal text-ink-2">{v}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="border-t border-hairline px-4.5 pt-3 pb-3.5 text-xs text-muted-foreground">
              Sem cookies e sem rastreamento de navegação. Os dados ficam em servidores no Brasil. Você sai quando
              quiser.
            </p>
          </Panel>
        </Stage>
      </div>
    </Section>
  );
}
