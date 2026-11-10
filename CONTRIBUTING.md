# Como contribuir

Obrigado por querer ajudar. O Fala, Canoas é feito por voluntários, e contribuições de qualquer tamanho são bem-vindas: código, revisão de texto, acessibilidade, testes em celulares diferentes, pesquisa sobre a cidade.

## Antes de começar

- **Mudança pequena** (um erro de digitação, um bug claro): pode abrir o pull request direto.
- **Mudança grande** (uma funcionalidade, uma regra de produto, uma dependência nova): abra uma issue primeiro, para combinar o caminho antes de você gastar tempo.
- **Falha de segurança ou de privacidade:** não abra issue. Siga o [`SECURITY.md`](SECURITY.md).
- **Regras de produto** (quem pode confirmar, quando um registro fecha, o que a moderação remove) são decisões registradas em [`research/DECISIONS.md`](research/DECISIONS.md). Uma proposta que mude uma delas precisa dizer qual rodada revê e por quê.

Nunca inclua dados pessoais reais em issues, testes, capturas de tela ou dados de exemplo: nem telefones, nem nomes, nem fotos de pessoas ou de placas.

## Preparar o ambiente

Siga "Rodar localmente" no [`README.md`](README.md). Você precisa do Bun e de um projeto Supabase seu; nenhum segredo do projeto é necessário para desenvolver.

## As regras do projeto

A referência completa é o [`CLAUDE.md`](CLAUDE.md) (em inglês). As que mais aparecem em revisão:

- **Idioma:** código, nomes e comentários em inglês. Tudo o que a pessoa lê na tela em português do Brasil, tratando por "você", sem tom partidário.
- **Uma regra, um lugar.** Regras de domínio, prazos e textos derivados deles vivem em `packages/core`. Se a regra já existe lá, use-a; não a reescreva num app nem digite o número de novo numa frase.
- **Sem `useEffect`.** Use estado derivado, handlers, TanStack Query ou Store, remontagem por `key`, ref callbacks, ou `useMountEffect`.
- **Sem `as`.** Use type guards, `satisfies` ou validação com Zod.
- **Rotas finas.** `apps/web/src/routes/` só liga a rota à tela. A interface vive em `apps/web/src/features/<domínio>/`; o que duas áreas compartilham vai para `src/components/` ou `src/lib/`.
- **Todo acesso a dados passa por funções de servidor** (`apps/web/src/server/`). O navegador nunca fala com o banco.
- **O celular não entra no app.** Nada em `apps/web` pode receber, guardar ou registrar em log um número de telefone: isso é do cofre (`apps/vault`).
- **Fotos começam pendentes.** Nenhuma foto nova pode nascer aprovada fora dos dados de exemplo.
- **Dados de exemplo são rotulados.** Nada fictício aparece sem a marca "exemplo"; números reais em telas públicas têm fonte em `research/`.
- **Cores e componentes:** use os tokens do `DESIGN.md` e os componentes existentes (shadcn/ui sobre Base UI). A cor de destaque é reservada à ação principal, ao relógio e ao lugar selecionado.
- **Comentários explicam o que o código não mostra:** uma lei, uma decisão, o comportamento de um sistema externo. Não repita o que a linha seguinte já diz.

## Testes

```sh
bun test
```

- Os testes ficam ao lado do código (`*.test.ts`).
- Lógica de domínio em `packages/core` precisa de teste.
- Um bom teste tem uma entrada concreta e um resultado escrito à mão, e falharia com um erro plausível. Evite testes que recalculam a resposta do mesmo jeito que o código.

## Antes de abrir o pull request

```sh
bun run typecheck
bun run lint
bun test
bun run format
```

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em inglês, no imperativo e com escopo: `fix(core): clamp the evidence cutoff at month ends`.
- **Um assunto por pull request.** Descreva o que muda para quem usa, como você testou e, se mexeu em tela, inclua uma captura (sem dados pessoais).
- Mudanças no banco entram como migração gerada (`bun run db:generate`), nunca editando uma migração já publicada.

## Licença das contribuições

Ao enviar uma contribuição, você concorda que ela seja distribuída sob a mesma licença do projeto, a [AGPL-3.0](LICENSE).
