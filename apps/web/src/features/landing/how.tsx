import type { Municipality } from "@fala/core";
import { Eye, EyeOff, Send } from "lucide-react";
import type { ReactNode } from "react";
import { Icon, categoryIcon } from "@/components/Icons";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MiniMap } from "./bairro-map";
import { Bar, Claim, Num, Panel, SecHead, Section, Stage } from "./bits";
import { DIGEST_ROWS } from "./landing-model";
import { countUpOnView } from "./motion";

const count43 = countUpOnView(43);

/** A claim beside its proof. flip puts the proof first on wide screens. */
function Pair({
  flip = false,
  first = false,
  claim,
  children,
}: {
  flip?: boolean;
  first?: boolean;
  claim: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-split max-split:grid-cols-1",
        flip ? "grid-cols-pair-flip" : "grid-cols-pair",
        !first && "mt-pair",
      )}
    >
      <div className={cn(flip && "order-2 max-split:order-none")}>{claim}</div>
      <Stage className="p-proof max-compact:p-3.5">{children}</Stage>
    </div>
  );
}

function Composer({ muni }: { muni: Municipality }) {
  const types = muni.categories.filter((c) => c.kind === "occurrence");
  return (
    <Panel label="Exemplo da tela de novo registro" className="mx-auto max-w-130">
      <Bar title="Novo registro" end={<Badge variant="chip">exemplo</Badge>} />
      <div className="grid gap-4.5 p-4.5">
        <div className="flex items-center gap-3.5">
          <img
            src="/media/parada-pin-400.webp"
            width={400}
            height={300}
            alt="Foto de exemplo: parada de ônibus laranja com a calçada molhada e rachada em dia de chuva, em Canoas."
            loading="lazy"
            decoding="async"
            className="h-22.5 w-30 shrink-0 rounded-lg border border-hairline object-cover max-narrow:h-18 max-narrow:w-24"
          />
          <p className="text-caption text-muted-foreground">
            <b className="mb-0.5 block text-sm font-semibold text-foreground">Foto anexada</b>
            Rostos e placas serão borrados ao publicar.
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-ink-2">Tipo de problema</p>
          <div className="flex flex-wrap gap-1.5">
            {types.map((c) => (
              <span
                key={c.key}
                className={cn(
                  "rounded-full border px-2.5 py-1.25 text-xs",
                  c.key === "alaga"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-ink-2",
                )}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3.5">
          <p className="flex-1 text-caption text-muted-foreground">
            <b className="block text-sm font-semibold text-foreground">Niterói</b>
            Arraste o pino até o ponto exato. A rua aparece; o seu endereço, nunca.
          </p>
          <div className="w-33 shrink-0 overflow-hidden rounded-lg border border-hairline bg-muted max-compact:w-26">
            <MiniMap geo={muni.geo.neighborhoods} selected="niteroi" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3.5 text-caption text-muted-foreground">
          <span>
            Publicar como <b className="font-semibold text-foreground">garça-do-sinos</b> · Niterói
          </span>
          <Badge variant="chip">apelido</Badge>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-hairline bg-muted px-4.5 py-3">
        <span className="flex items-center gap-1.75 text-caption text-muted-foreground">
          <EyeOff className="size-3.75" aria-hidden="true" />
          Seu nome não aparece.
        </span>
        <span aria-hidden="true" className={cn(buttonVariants({ size: "lg" }))}>
          Enviar
        </span>
      </div>
    </Panel>
  );
}

function Digest() {
  return (
    <Panel label="Exemplo do resumo diário enviado à Prefeitura" className="mx-auto max-w-140">
      <Bar title="Resumo diário" end={<Badge variant="chip">exemplo</Badge>} />
      <div className="grid gap-1.25 border-b border-hairline px-4.5 py-3.5 text-caption text-muted-foreground">
        <div className="flex gap-2">
          <span className="w-13 shrink-0">De</span>
          <b className="font-medium text-foreground">resumo@falacanoas.com.br</b>
        </div>
        <div className="flex gap-2">
          <span className="w-13 shrink-0">Para</span>
          <b className="font-medium text-foreground">Ouvidoria-Geral do Município de Canoas</b>
        </div>
        <p className="mt-1.5 text-base font-semibold tracking-tight text-foreground">
          Resumo de 30 de agosto: 23 registros novos
        </p>
      </div>
      <ul className="py-1.5">
        {DIGEST_ROWS.map((r, i) => (
          <li
            key={r.time}
            className={cn(
              "flex items-baseline gap-3 border-b border-hairline px-4.5 py-2.25 text-caption text-ink-2",
              i === 0 && "bg-signal-wash/60",
            )}
          >
            <Num className="w-13 shrink-0 text-xs text-muted-foreground">{r.time}</Num>
            <span className={cn("flex-1", i === 0 && "font-medium text-foreground")}>{r.what}</span>
            <span className="text-xs whitespace-nowrap text-muted-foreground">{r.where}</span>
          </li>
        ))}
        <li className="flex items-baseline gap-3 px-4.5 py-2.25 text-caption text-ink-2">
          <Num className="w-13 shrink-0 text-xs text-muted-foreground">+18</Num>
          <span className="flex-1">outros, com foto, lugar e link</span>
        </li>
      </ul>
      <div className="flex items-center gap-2.5 border-t border-hairline bg-muted px-4.5 py-3 text-xs text-muted-foreground">
        <Send className="size-3.75 text-ink-2" aria-hidden="true" />
        <span>
          Enviado às <Num className="text-foreground">18:00</Num>. O relógio de 23 registros começou.
        </span>
      </div>
    </Panel>
  );
}

function CountCard() {
  return (
    <Panel
      label="Exemplo de registro com a contagem de dias"
      className="mx-auto grid max-w-150 grid-cols-2 max-compact:grid-cols-1"
    >
      <div className="relative h-full bg-panel-3 max-compact:aspect-16/10">
        <img
          src="/media/parada-pin-800.webp"
          width={800}
          height={600}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
        <Badge variant="chip" className="absolute top-2.5 left-2.5">
          exemplo
        </Badge>
      </div>
      <div className="grid content-start gap-4 p-5">
        <div>
          <p className="flex items-center gap-1.75 text-xs text-muted-foreground">
            <Icon name={categoryIcon("alaga")} size={14} />
            Rua que alaga toda chuva · Niterói
          </p>
          <p className="text-base leading-snug font-semibold tracking-tight">Parada de ônibus vira poça a cada chuva</p>
        </div>
        <div className="flex items-baseline gap-2.5">
          <Num className="text-counter font-medium text-signal-text">
            <span ref={count43}>43</span>
          </Num>
          <span className="text-sm leading-tight text-muted-foreground">
            dias
            <br />
            em aberto
          </span>
        </div>
        <dl className="grid border-t border-hairline text-caption">
          {[
            ["Enviado à Prefeitura", "30 ago, 18:00"],
            ["Também viram", "7 vizinhos"],
            ["Resposta", "nenhuma ainda"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2.5 border-b border-hairline py-2 text-muted-foreground">
              <dt>{k}</dt>
              <dd className="font-mono text-xs font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <span
          aria-hidden="true"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-self-start")}
        >
          <Eye />
          Também vi
        </span>
      </div>
    </Panel>
  );
}

function Closing() {
  const steps: { id: string; done: boolean; date: string; text: ReactNode }[] = [
    {
      id: "prefeitura",
      done: true,
      date: "12 out",
      text: (
        <>
          <b className="font-semibold text-foreground">Prefeitura</b> respondeu “resolvido”
          <span className="ml-1.5 inline-flex items-center rounded-md border border-border px-1.5 py-px font-mono text-micro text-ink-2">
            conta verificada
          </span>
        </>
      ),
    },
    {
      id: "vizinho",
      done: true,
      date: "13 out",
      text: (
        <>
          <b className="font-semibold text-foreground">garça-do-sinos</b> confirmou, com foto
        </>
      ),
    },
    { id: "falta", done: false, date: "—", text: "Falta mais 1 vizinho, ou 15 dias sem contestação" },
    {
      id: "fechado",
      done: false,
      date: "—",
      text: <span className="font-semibold text-foreground">Fechado. Entra no placar.</span>,
    },
  ];
  return (
    <Panel label="Exemplo de registro sendo fechado pelos vizinhos" className="mx-auto max-w-140">
      <Bar title="Parada de ônibus vira poça a cada chuva" end={<Badge variant="chip">exemplo</Badge>} />
      <div className="grid grid-cols-2 gap-2.5 px-4.5 pt-4 pb-1">
        <figure className="grid min-w-0 gap-1.5 font-mono text-micro text-muted-foreground">
          <img
            src="/media/parada-pin-400.webp"
            width={400}
            height={300}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-4/3 w-full rounded-lg border border-hairline object-cover"
          />
          <figcaption>antes · 30 ago</figcaption>
        </figure>
        <figure className="grid min-w-0 gap-1.5 font-mono text-micro text-muted-foreground">
          <div className="grid aspect-4/3 w-full place-items-center rounded-lg border border-dashed border-hairline-strong bg-muted p-2.5 text-center font-sans text-xs">
            Foto do depois, enviada por quem confirma
          </div>
          <figcaption>depois · aguardando</figcaption>
        </figure>
      </div>
      <ol className="px-4.5 pt-3.5 pb-4.5">
        {steps.map((s, i) => (
          <li key={s.id} className="relative flex items-baseline gap-2.5 py-2.25 text-caption text-ink-2">
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="absolute top-6 -bottom-2.25 left-1.25 w-px bg-border" />
            )}
            <span className="flex w-5.5 shrink-0 self-center">
              <span
                className={cn(
                  "relative z-1 size-2.75 rounded-full border",
                  s.done ? "border-foreground bg-foreground" : "border-muted-foreground bg-card",
                )}
              />
            </span>
            <Num className="w-13 shrink-0 text-xs text-muted-foreground">{s.date}</Num>
            <span>{s.text}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function HowItWorks({ muni }: { muni: Municipality }) {
  return (
    <Section id="como-funciona">
      <SecHead id="como-funciona" title="Como vai funcionar, do celular ao conserto.">
        O mapa abre bairro por bairro. Estes são os quatro passos de cada registro, com um exemplo do começo ao fim.
      </SecHead>

      <Pair
        first
        claim={
          <Claim
            step={1}
            title="Uma foto, o tipo de problema, o lugar."
            more="Dez tipos de problema na estreia, cada um ligado ao órgão responsável."
          >
            <p>
              Registrar leva menos de um minuto. Em público, você aparece só com um apelido e o seu bairro. Rostos e
              placas são borrados, e os dados escondidos da foto, como o GPS do celular, são apagados.
            </p>
          </Claim>
        }
      >
        <Composer muni={muni} />
      </Pair>

      <Pair
        flip
        claim={
          <Claim
            step={2}
            title="Todo dia, a lista vai para a Prefeitura."
            more="Quando a fila de inscritos crescer, a Prefeitura será convidada a responder por uma conta verificada."
          >
            <p>
              Às 18h, o Fala, Canoas manda à Ouvidoria-Geral do Município um resumo com os registros novos do dia, em
              nome do projeto. O relógio de cada registro começa nesse envio, e a hora fica pública.
            </p>
          </Claim>
        }
      >
        <Digest />
      </Pair>

      <Pair
        claim={
          <Claim
            step={3}
            title="O relógio conta em público."
            more="Antes de registrar, o mapa mostra problemas parecidos a poucos metros, para não duplicar."
          >
            <p>
              Cada registro mostra há quantos dias está aberto, quando foi enviado e quantos vizinhos também viram.
              Ninguém precisa reclamar de novo: um toque em “também vi” soma à mesma contagem.
            </p>
          </Claim>
        }
      >
        <CountCard />
      </Pair>

      <Pair
        flip
        claim={
          <Claim step={4} title="Só fecha quando os vizinhos confirmam.">
            <p>
              A Prefeitura pode responder “resolvido”. O registro só fecha quando quem registrou ou dois vizinhos
              confirmam, de preferência com uma foto do depois. Se ninguém contestar em 15 dias, fecha sozinho.
            </p>
          </Claim>
        }
      >
        <Closing />
      </Pair>
    </Section>
  );
}
