import type { Municipality } from "@fala/core";
import { Plus } from "lucide-react";
import { EmergencyLines } from "@/components/emergency";
import type { ReactNode } from "react";
import { Fn, Num, Section, textLink } from "./bits";
import { cn } from "@/lib/utils";

/** The answers name the instance's own emergency lines, so the list is built for a municipality. */
const questions = (muni: Municipality): { q: string; a: ReactNode }[] => [
  {
    q: "É um canal da Prefeitura?",
    a: (
      <p>
        Não. O Fala, Canoas é independente: não tem vínculo com a Prefeitura nem com nenhum órgão público. O resumo das
        18h vai à Ouvidoria-Geral do Município em nome do projeto, e quem responde é a Prefeitura.
      </p>
    ),
  },
  {
    q: "Por que contar em dias?",
    a: (
      <p>
        Porque o tempo é o que se pode conferir. Em 2024 a Ouvidoria recebeu <Num>2.772</Num> manifestações.
        <Fn n={1} /> No período da enchente, <Num>53,7%</Num> delas foram respondidas em até <Num>30</Num> dias,
        <Fn n={1} /> o prazo da lei.
        <Fn n={3} /> Um relógio público mostra quanto cada órgão leva, registro por registro.
      </p>
    ),
  },
  {
    q: "O que não entra no mapa?",
    a: (
      <ul className="grid gap-2">
        <li>
          Crimes e violência: para isso existem a polícia e o <Num>190</Num>.
        </li>
        <li>Reclamação contra uma pessoa: o mapa aponta serviços e órgãos, nunca alguém pelo nome.</li>
        <li>Briga entre vizinhos: barulho, obra do lado, cachorro do vizinho não são serviço público.</li>
        <li>
          Emergência: <EmergencyLines muni={muni} />. Alagamento que volta toda chuva, sim, entra.
        </li>
      </ul>
    ),
  },
  {
    q: "Por que meu bairro precisa de uma fila?",
    a: (
      <p>
        Cada bairro abre quando tem vizinhos para registrar e confirmar os consertos: cerca de 1 inscrito para cada 300
        moradores, com mínimo de <Num>25</Num>.<Fn n={4} /> Industrial, Brigadeira e Ilha das Garças, que têm poucos
        moradores, abrem junto com o primeiro bairro que encher.
      </p>
    ),
  },
  {
    q: "O que vocês guardam sobre mim?",
    a: (
      <p>
        O seu bairro, para contar a fila; o WhatsApp ou e-mail, para avisar quando ele abrir, e mais nada; e, se você
        quiser, como pode ajudar. Sem cookies e sem rastreamento de navegação. Os dados ficam em servidores no Brasil, e
        você sai quando quiser. Os detalhes estão no{" "}
        <a href="#privacidade" className={cn("text-foreground", textLink)}>
          aviso de privacidade
        </a>
        .
      </p>
    ),
  },
  {
    q: "Quem paga?",
    a: (
      <p>
        Por enquanto, o fundador. O projeto não aceita dinheiro de governos, partidos ou candidatos, e o código é aberto
        (AGPL-3.0), para qualquer pessoa conferir.
      </p>
    ),
  },
];

export function Faq({ muni }: { muni: Municipality }) {
  return (
    <Section id="perguntas" divided>
      <div className="grid grid-cols-pair items-start gap-split max-split:grid-cols-1">
        <div className="grid content-start gap-4 split:sticky split:top-27">
          <h2 id="h-perguntas" className="text-title font-semibold text-balance">
            Perguntas de quem mora aqui.
          </h2>
          <p className="max-w-claim text-pretty text-ink-2">
            O que o Fala, Canoas faz, o que ele não faz e o que acontece com os seus dados.
          </p>
        </div>
        <div>
          {questions(muni).map(({ q, a }) => (
            <details key={q} className="group border-t border-hairline last:border-b">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-heading font-semibold text-balance">
                {q}
                <Plus
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-fluid group-open:rotate-45"
                />
              </summary>
              <div className="grid max-w-copy gap-3 pb-6 text-pretty text-ink-2">{a}</div>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
