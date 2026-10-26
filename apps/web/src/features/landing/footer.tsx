import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Num, Wrap, textLink } from "./bits";

function Disclosure({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <details id={id} className="group border-t border-hairline py-3.5 last-of-type:border-b">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-foreground">
        {title}
        <ChevronDown
          className="size-4.5 text-muted-foreground transition-transform duration-250 ease-fluid group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="grid max-w-long gap-2.5 pt-3 text-caption leading-relaxed text-ink-2">{children}</div>
    </details>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-hairline pt-section-sm pb-10 text-sm text-muted-foreground">
      <Wrap>
        <div className="grid grid-cols-aside gap-split max-compact:grid-cols-1">
          <div>
            <p className="text-2xl leading-none font-semibold tracking-tighter text-foreground">
              Fala<span className="text-signal">,</span> Canoas
            </p>
            <p className="mt-3 max-w-foot">
              Mapa independente e de código aberto para acompanhar, em dias, os problemas urbanos de Canoas, RS. Não é
              um canal da Prefeitura.
            </p>
            <p className="mt-7 flex flex-wrap gap-x-4.5 gap-y-1.5 text-ink-2">
              Em emergência:{" "}
              <span>
                Defesa Civil <Num className="text-foreground">199</Num>
              </span>
              <span>
                Bombeiros <Num className="text-foreground">193</Num>
              </span>
            </p>
          </div>
          <div>
            <h2 id="fontes" className="mb-3 text-sm leading-snug font-semibold text-foreground">
              Fontes
            </h2>
            <ol className="grid list-decimal gap-2 pl-5.5 text-caption leading-normal marker:font-mono marker:text-muted-foreground">
              <li id="fn1">
                Prefeitura de Canoas, Ouvidoria-Geral do Município.{" "}
                <a
                  className={cn("text-ink-2 break-words", textLink)}
                  href="https://www.canoas.rs.gov.br/wp-content/uploads/2024/12/RELATORIO-ANUAL-OUVIDORIA-2024-_1_.pdf"
                >
                  Relatório Anual da Ouvidoria 2024
                </a>
                . Manifestações até 20/12/2024; anexo com a situação das manifestações do período da enchente.
              </li>
              <li id="fn2">
                Cálculo do Fala, Canoas: 2.772 manifestações ÷ 347.657 habitantes. População:{" "}
                <a
                  className={cn("text-ink-2", textLink)}
                  href="https://www.ibge.gov.br/cidades-e-estados/rs/canoas.html"
                >
                  IBGE, Censo 2022
                </a>
                .
              </li>
              <li id="fn3">
                <a
                  className={cn("text-ink-2", textLink)}
                  href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13460.htm"
                >
                  Lei nº 13.460/2017
                </a>
                , art. 16. Em Canoas, regulamentada pelo Decreto Municipal nº 434/2019.
              </li>
              <li id="fn4">
                Bairros: os 18 bairros oficiais (Lei Municipal nº 4.736/2003), com os limites da malha de bairros do
                IBGE, Censo 2022. Tamanho da fila: população de 2022 por bairro na camada de bairros oficiais do{" "}
                <a className={cn("text-ink-2", textLink)} href="https://geo.canoas.rs.gov.br/">
                  GeoCanoas
                </a>
                , arredondada.
              </li>
            </ol>

            <div className="mt-8">
              <Disclosure id="privacidade" title="Aviso de privacidade">
                <p>
                  <b>Quem cuida dos dados.</b> Pedro Seibel, pessoa física, responsável pelo Fala, Canoas (controlador,
                  conforme a Lei Geral de Proteção de Dados, Lei nº 13.709/2018). Contato: contato@falacanoas.com.br.
                </p>
                <p>
                  <b>Quais dados.</b> Seu bairro, seu número de WhatsApp ou seu e-mail e, se você marcar, como pode
                  ajudar. Mais nada: a página não usa cookies nem ferramentas de análise.
                </p>
                <p>
                  <b>Para quê.</b> Contar a fila de cada bairro, avisar quando o seu abrir e, se você pediu, chamar para
                  ajudar. Nenhum outro uso, nenhuma venda, nenhum compartilhamento.
                </p>
                <p>
                  <b>Com que base.</b> Seu consentimento, dado ao marcar a caixa do formulário (LGPD, art. 7º, I). Você
                  pode retirá-lo a qualquer momento.
                </p>
                <p>
                  <b>Onde e por quanto tempo.</b> Em banco de dados com servidores em São Paulo, Brasil. Guardamos até
                  12 meses depois da abertura do seu bairro, ou até você pedir para sair.
                </p>
                <p>
                  <b>Seus direitos.</b> Pedir acesso, correção ou exclusão dos seus dados a qualquer momento (LGPD, art.
                  18): escreva para contato@falacanoas.com.br ou responda “SAIR” no WhatsApp.
                </p>
                <p>
                  <b>Idade.</b> A fila é só para maiores de 18 anos.
                </p>
              </Disclosure>
              <Disclosure title="Créditos">
                <p>
                  Limites dos bairros: IBGE, malha de bairros do Censo 2022. Tipografia: Geist e Geist Mono, licença SIL
                  Open Font License.
                </p>
                <p>Todos os registros, apelidos, datas e números marcados como “exemplo” são fictícios.</p>
              </Disclosure>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-x-6 gap-y-2.5 border-t border-hairline pt-5 text-caption">
          <span>Fala, Canoas · independente · código AGPL-3.0</span>
          <a className={textLink} href="#top">
            Voltar ao topo
          </a>
        </div>
      </Wrap>
    </footer>
  );
}
