import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthFrame, type BackLink } from "@/features/auth/auth-frame";
import { textLink } from "@/features/landing/bits";
import { moderationStandingQuery } from "@/lib/city";
import { acceptModerationGuide } from "@/server/volunteers";

/**
 * The moderation guide (moderation capacity; DECISIONS rounds 19 and 20). One text for everyone, and
 * public: the STF tese asks for published rules, and residents should know how their posts are judged.
 * A moderator accepts it before deciding cases; bump MODERATION_GUIDE_VERSION with every change.
 */

function Part({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <h2 id={id} className="text-ui font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const list = "grid list-disc gap-1.5 pl-5 text-ui text-pretty text-ink-2";

export function ModerationGuide() {
  return (
    <div className="grid gap-6">
      <Part id="g-ve" title="O que você vê, e o que não vê">
        <ul className={list}>
          <li>Você vê o conteúdo e um código. Nunca quem publicou, nem quem denunciou.</li>
          <li>Você não decide sobre o que você mesmo publicou: outra pessoa da moderação decide.</li>
          <li>Quem decidiu um caso não julga a contestação dele.</li>
        </ul>
      </Part>

      <Part id="g-fotos" title="Fotos">
        <ul className={list}>
          <li>
            <b className="font-medium text-foreground">Mantenha</b> a foto que mostra o problema, mesmo feia ou tremida,
            se der para entender.
          </li>
          <li>
            <b className="font-medium text-foreground">Remova pedindo outra</b> quando aparecer rosto ou placa legível,
            criança, o interior de uma casa ou alguém em situação vulnerável. Peça uma foto enquadrada só no problema.
            Isso não conta contra quem enviou.
          </li>
          <li>
            <b className="font-medium text-foreground">Remova com peso</b> nudez, violência ou ofensa.
          </li>
        </ul>
      </Part>

      <Part id="g-textos" title="Textos e conversas">
        <ul className={list}>
          <li>Críticas a serviços e a órgãos são bem-vindas, mesmo duras.</li>
          <li>
            Remova ataques a pessoas: nomes de vizinhos, acusações, endereço ou telefone de alguém, xingamentos,
            discriminação.
          </li>
          <li>Remova propaganda política e pedidos de voto, e redobre a atenção no período eleitoral.</li>
          <li>Na dúvida entre remover e manter, peça para a pessoa reescrever.</li>
        </ul>
      </Part>

      <Part id="g-peso" title="O peso de uma remoção">
        <ul className={list}>
          <li>
            <b className="font-medium text-foreground">Sem peso:</b> foto a refazer, engano, assunto fora do lugar.
          </li>
          <li>
            <b className="font-medium text-foreground">Aviso:</b> passou do limite, sem gravidade.
          </li>
          <li>
            <b className="font-medium text-foreground">Grave:</b> ataque a alguém, nudez, ofensa séria.
          </li>
        </ul>
        <p className="text-ui text-pretty text-ink-2">
          Avisos e remoções graves se somam: quem acumula fica silenciado ou suspenso por um tempo, automaticamente, e
          pode contestar.
        </p>
      </Part>

      <Part id="g-nota" title="A nota que você escreve">
        <p className="text-ui text-pretty text-ink-2">
          A pessoa lê a sua nota. Diga o que estava errado e o que ela pode fazer, em uma frase, sem julgar quem ela é.
          Por exemplo: “A foto mostra o rosto de uma pessoa. Mande outra só com o buraco.”
        </p>
      </Part>

      <Part id="g-abuso" title="Abuso sexual infantil">
        <ul className={list}>
          <li>
            Aperte <b className="font-medium text-foreground">É abuso sexual infantil</b>. A foto sai do ar na hora,
            ninguém mais a vê, a conta é suspensa e o caso vai para a pessoa responsável, que denuncia às autoridades.
          </li>
          <li>
            Não abra de novo, não baixe, não fotografe a tela e não mande para ninguém, nem para avisar. Guardar ou
            repassar esse material é crime, mesmo com boa intenção.
          </li>
          <li>
            Fotos novas são comparadas com material de abuso já conhecido antes de chegarem a você. Mesmo assim, algo
            novo pode aparecer.
          </li>
          <li>Se isso mexeu com você, fale com quem cuida do Fala. Você pode parar a qualquer momento.</li>
        </ul>
      </Part>

      <Part id="g-intimas" title="Imagens íntimas">
        <p className="text-ui text-pretty text-ink-2">
          Nudez ou sexo de um adulto exposto sem consentimento: remova na hora, com peso grave.
        </p>
      </Part>

      <Part id="g-neutro" title="Neutralidade">
        <p className="text-ui text-pretty text-ink-2">
          O Fala não toma partido. Modere do mesmo jeito em qualquer bairro, sobre qualquer órgão e qualquer opinião. O
          placar fala de órgãos, nunca de pessoas.
        </p>
      </Part>

      <Part id="g-privado" title="O que fica na fila">
        <p className="text-ui text-pretty text-ink-2">
          O que você vê na moderação fica na moderação: não tire print, não comente em grupos, não procure saber quem
          publicou.
        </p>
      </Part>

      <Part id="g-voce" title="Cuidar de você">
        <p className="text-ui text-pretty text-ink-2">
          Não há meta. Modere quando puder; o Fala avisa quando algo espera há mais de três horas no seu bairro, no
          máximo a cada seis horas. Se quiser parar, avise quem cuida do Fala.
        </p>
      </Part>
    </div>
  );
}

/** /moderacao: the guide, public. */
export function GuidePage({ back }: { back: BackLink }) {
  return (
    <AuthFrame back={back} width="read">
      <header className="grid gap-2">
        <h1 className="text-heading font-semibold text-balance">Como moderamos</h1>
        <p className="text-ui text-pretty text-ink-2">
          Moderadores são vizinhos voluntários. Olham cada foto antes de ela aparecer, as denúncias e os registros em
          análise. Este guia é o mesmo para todos, e é público. Os números da moderação estão no{" "}
          <a href="/transparencia" className={textLink}>
            relatório de transparência
          </a>
          .
        </p>
      </header>
      <ModerationGuide />
    </AuthFrame>
  );
}

/** Before a moderator's first decision, and after every change to the guide. */
export function GuideGate() {
  const queryClient = useQueryClient();
  const accept = useMutation({
    mutationFn: () => acceptModerationGuide(),
    onSuccess: (r) => {
      if (!r.ok) return void toast(r.error);
      void queryClient.invalidateQueries({ queryKey: moderationStandingQuery.queryKey });
    },
    onError: () => toast("Não deu para registrar agora. Tente de novo."),
  });
  return (
    <div className="mx-auto grid max-w-2xl gap-8 px-7 pt-8 pb-16 max-phone:px-4 max-phone:pt-5 max-phone:pb-24">
      <header className="grid gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Antes de moderar</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          Leia o guia da moderação. Ele é o mesmo para todos e é público; quando mudar, pedimos de novo.
        </p>
      </header>
      <ModerationGuide />
      <Button
        variant="signal"
        size="lg"
        className="justify-self-start"
        disabled={accept.isPending}
        onClick={() => accept.mutate()}
      >
        Li e vou seguir este guia
      </Button>
    </div>
  );
}
