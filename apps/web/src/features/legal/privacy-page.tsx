import type { ReactNode } from "react";
import { AuthFrame, type BackLink } from "@/features/auth/auth-frame";
import { textLink } from "@/features/landing/bits";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-ui font-semibold">{title}</h2>
      <div className="grid gap-2 text-ui text-pretty text-ink-2">{children}</div>
    </section>
  );
}

/**
 * The app's privacy notice: what an account stores, what is public, and for how long, as decided in
 * research/DECISIONS.md round 18. Preliminary: the legal bases and the text await legal review, which
 * is a launch condition. The waitlist keeps its own notice on the landing page.
 */
export function PrivacyPage({ back, version }: { back: BackLink; version: string }) {
  return (
    <AuthFrame back={back} width="read">
      <header className="grid gap-2">
        <h1 className="text-heading font-semibold text-balance">Aviso de privacidade do app</h1>
        <p className="text-caption text-muted-foreground">
          Versão preliminar de <span className="tabular-nums">{version.split("-").toReversed().join("/")}</span>, em
          revisão jurídica. Vale para o protótipo. A fila de espera tem aviso próprio, na{" "}
          <a href="/#privacidade" className={textLink}>
            página inicial
          </a>
          .
        </p>
      </header>

      <p className="rounded-xl border border-dashed border-hairline-strong px-4 py-3 text-caption text-ink-2">
        Protótipo: contas, registros e fotos ficam num banco de dados de teste, em São Paulo, e podem ser apagados a
        qualquer momento. Nenhum resumo é enviado à Prefeitura.
      </p>

      <Part title="Quem cuida dos dados">
        <p>
          Pedro Seibel, pessoa física, responsável pelo Fala, Canoas (controlador, conforme a Lei Geral de Proteção de
          Dados, Lei nº 13.709/2018). Contato: contato@falacanoas.com.br. Antes de abrir o app ao público, o Fala vai
          passar a ser cuidado por uma associação, e este aviso vai mudar junto.
        </p>
      </Part>

      <Part title="O que aparece em público">
        <p>
          Seu apelido e o seu bairro, nos registros que você assina. O que você registra: as fotos, o ponto que você
          marca no mapa e o texto. Se você escolher “Anônimo em público”, o registro aparece sem o seu apelido.
        </p>
      </Part>

      <Part title="O que fica guardado e não aparece">
        <ul className="grid list-disc gap-1.5 pl-5">
          <li>
            Seu celular, para você entrar. Ele fica cifrado, num cofre separado do resto do Fala. Também serve para
            colaborar com a identificação de quem publicou, quando houver requisição legalmente válida, sem garantia de
            que essa identificação seja sempre possível.
          </li>
          <li>
            Que você declarou ter 18 anos ou mais e confirmou ter lido este aviso, com a versão do aviso e a data.
          </li>
          <li>Se você criar uma passkey, a parte pública dela. A parte secreta fica só no seu aparelho.</li>
          <li>
            Registros de acesso: endereço IP, porta, data e hora de cada entrada e de cada registro, confirmação ou
            comentário. Ficam guardados por 6 meses, como pede o Marco Civil da Internet (art. 15), e são apagados
            depois. Só saem daqui com ordem judicial.
          </li>
          <li>
            Com “Anônimo em público”, o Fala ainda liga o registro à sua conta, para evitar abuso e permitir moderação.
            Moderadores e a Prefeitura nunca veem quem publicou.
          </li>
        </ul>
      </Part>

      <Part title="Moderação e triagem automática">
        <p>
          Antes de aparecer no mapa, cada foto passa por alguém da moderação. Antes disso, um serviço do próprio Fala,
          em São Paulo, olha a foto procurando nudez, rostos e placas, para orientar quem modera. Ele não reconhece quem
          aparece, não guarda a foto e não manda nada a outras empresas.
        </p>
        <p>
          Quem denuncia um conteúdo não é revelado a ninguém. Se a moderação remover algo seu, silenciar ou suspender a
          sua conta, você vê o motivo na página Você e pode contestar. Nada disso aparece em público. Os números da
          moderação estão no{" "}
          <a href="/transparencia" className={textLink}>
            relatório de transparência
          </a>
          .
        </p>
      </Part>

      <Part title="O que não coletamos">
        <p>
          CPF, documentos, data de nascimento ou a localização do seu aparelho: o GPS só move o mapa na tela, e o ponto
          do registro é o que você marca. As fotos saem do seu aparelho sem GPS e sem os dados da câmera. Não usamos
          cookies de análise nem de publicidade.
        </p>
      </Part>

      <Part title="Com quem compartilhamos">
        <p>
          A Prefeitura recebe os registros (texto, fotos e local) no resumo diário, sem quem os fez. Autoridades recebem
          o que a lei exige: material de abuso sexual infantil, que é denunciado e preservado, e dados de acesso
          mediante ordem judicial. Não vendemos nem repassamos dados para fins comerciais.
        </p>
      </Part>

      <Part title="Por quanto tempo">
        <p>
          A conta, até você encerrá-la. Os registros de acesso, por 6 meses. Fotos removidas pela moderação ficam
          guardadas, sem aparecer, por 6 meses, e depois são apagadas; material de abuso sexual infantil é preservado
          até as autoridades confirmarem que o receberam, como a lei exige. O que você publicou continua no mapa como
          parte do histórico da cidade, desligado da sua identidade se você encerrar a conta. Pedidos de remoção,
          ocultação ou anonimização são avaliados conforme a LGPD, os direitos de outras pessoas e a finalidade
          documental do Fala.
        </p>
      </Part>

      <Part title="Seus direitos">
        <p>
          Você pode pedir acesso, correção, exclusão ou se opor a um tratamento (LGPD, art. 18): escreva para
          contato@falacanoas.com.br. Quem não tem conta também pode pedir, por exemplo se aparece numa foto. Nunca
          pedimos documento de identidade por padrão.
        </p>
      </Part>

      <Part title="Bases legais">
        <p>
          As bases legais de cada tratamento estão em revisão jurídica e serão indicadas aqui antes da abertura ao
          público.
        </p>
      </Part>

      <Part title="Idade">
        <p>O app é só para maiores de 18 anos.</p>
      </Part>
    </AuthFrame>
  );
}
