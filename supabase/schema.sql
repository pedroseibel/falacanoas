-- Fala, Canoas · fila por bairro (Supabase, região São Paulo / sa-east-1)
-- Aplicar no SQL Editor do projeto. A página só usa a chave "anon".

create table if not exists public.inscricoes (
  id            uuid primary key default gen_random_uuid(),
  bairro        text not null check (bairro in (
                  'brigadeira','centro','estancia-velha','fatima','guajuviras','harmonia','igara',
                  'ilha-das-garcas','industrial','marechal-rondon','mathias-velho','mato-grande',
                  'niteroi','nossa-senhora-das-gracas','olaria','rio-branco','sao-jose','sao-luis')),
  canal         text not null check (canal in ('whatsapp','email')),
  contato       text not null unique,          -- 55DDDNUMERO ou e-mail em minúsculas
  ajuda         text[] not null default '{}' check (ajuda <@ array['moderar','codigo','divulgar']),
  codigo        text not null check (codigo ~ '^[A-Z0-9]{4}$'),
  confirmado_em timestamptz,                    -- preenchido só pelo servidor (WhatsApp ou link do e-mail)
  criado_em     timestamptz not null default now()
);

alter table public.inscricoes enable row level security;

-- A página pode inserir, e nada mais: não lê, não altera, não confirma.
create policy "anon insere inscricao nao confirmada"
  on public.inscricoes for insert to anon
  with check (confirmado_em is null);

-- Contagem pública: só agregados, nunca contatos.
create or replace view public.fila_por_bairro
  with (security_invoker = false) as
  select bairro, count(*) filter (where confirmado_em is not null)::int as confirmados
  from public.inscricoes
  group by bairro;

revoke all on public.inscricoes from anon;
grant insert (bairro, canal, contato, ajuda, codigo) on public.inscricoes to anon;
grant select on public.fila_por_bairro to anon;

-- Confirmação (a implementar fora da página):
--  WhatsApp: o webhook do número do projeto recebe "CONFIRMAR XXXX" do mesmo número
--            e faz: update inscricoes set confirmado_em = now() where contato = <remetente> and codigo = 'XXXX';
--  E-mail:   uma Edge Function envia o link com o código e confirma do mesmo jeito.
-- Exclusão a pedido (LGPD art. 18): delete from inscricoes where contato = '...';
