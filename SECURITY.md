# Segurança

O Fala, Canoas guarda dados de moradores (um celular cifrado, fotos, o que cada conta publicou). Levamos a sério qualquer falha que exponha uma pessoa.

## Como relatar

**Não abra uma issue pública nem comente a falha em público.**

1. Use o relato privado do GitHub: na aba **Security** deste repositório, **Report a vulnerability**.
2. Se não puder usar o GitHub, escreva para **contato@falacanoas.com.br** com o assunto "Segurança".

Inclua o que for possível:

- o que a falha permite fazer e quem é afetado;
- os passos para reproduzir, ou uma prova de conceito;
- a versão (o commit) e o serviço envolvido (`apps/web`, `apps/vault`, `apps/whatsapp`…).

Não envie dados pessoais de terceiros no relato. Se, ao testar, você teve acesso a dados de outra pessoa, pare, não guarde cópia e conte o que viu em termos gerais.

## O que esperar

O projeto é mantido por voluntários. Vamos confirmar o recebimento assim que possível, manter você a par da correção e dar o crédito pela descoberta, se você quiser. Pedimos um prazo razoável para corrigir antes de qualquer divulgação.

## Escopo

Interessa especialmente:

- acesso a números de celular, ao conteúdo do cofre de identidade ou às suas chaves;
- identificar quem publicou como "Anônimo", ou o autor de um registro de convidado;
- ver fotos ou registros retidos, removidos ou encaminhados pela moderação;
- agir como outra conta, como moderador ou como um dos serviços internos;
- burlar os limites de envio de códigos, de registros ou de denúncias;
- qualquer caminho pelo qual uma foto saia do país ou vá a terceiros sem que isso esteja descrito no aviso de privacidade.

Fica fora do escopo:

- testes de negação de serviço, envio em massa e engenharia social contra voluntários ou moradores;
- testes contra o serviço em produção que criem registros falsos visíveis ao público ou mexam em dados de outras pessoas. Rode a sua própria cópia: o [`README.md`](README.md) explica como;
- falhas em serviços de terceiros (Cloudflare, Supabase, provedores de mensagens), que devem ser relatadas a eles.

## Pesquisa de boa-fé

Não tomaremos medidas contra quem pesquisar de boa-fé, dentro deste escopo, sem acessar ou reter dados de terceiros além do necessário para demonstrar a falha, e nos avisar antes de divulgar.
