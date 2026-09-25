-- ============================================================================
-- admin_rf98.stripe_pagamentos + stripe_receita_mes() — o dinheiro que ENTRA.
-- ----------------------------------------------------------------------------
-- POR QUE ISTO EXISTE. A pagina de Financas ja' lancava a despesa sozinha (a IA
-- do Estudio), mas a RECEITA era toda digitada a mao: alguem tinha de olhar o
-- painel do Stripe e escrever "+ Receita" mes a mes. Enquanto ninguem escrevia,
-- o painel mostrava lucro negativo com o dinheiro ja' na conta.
--
-- O WEBHOOK JA' ESTAVA LA'. `stripe-webhook` e' o unico lugar que sabe, com
-- prova de assinatura, que uma cobranca foi paga -- so' que ele usava o evento
-- para conceder plano e deitava fora o VALOR. Agora grava as duas coisas.
--
-- UMA LINHA POR COBRANCA, com o id do Stripe como chave primaria: o Stripe
-- reenvia eventos quando quer, e um `upsert` sobre o id faz o reenvio nao somar
-- nada. Sem isso, uma reentrega de um dia mau duplicaria a receita do mes.
--
-- O QUE FICA GUARDADO E' O QUE O EXTRATO PRECISA: bruto (o que o cliente pagou),
-- taxa e liquido (o que de facto cai na conta, quando o Stripe conta) e o
-- reembolsado. A pagina lanca o bruto como receita e a taxa como despesa --
-- lancar so' o liquido esconderia o custo de vender, que e' real e cresce.
--
-- NINGUEM ESCREVE PELO CLIENTE. So' o service_role do webhook toca aqui; nao ha'
-- policy de escrita, de proposito. O painel le' pela funcao abaixo.
-- ============================================================================

create table if not exists admin_rf98.stripe_pagamentos (
  id                   text primary key,          -- in_… (fatura) ou cs_… (sessao do Pix) — a COMPRA
  cobranca_id          text,                      -- ch_… — a cobranca; e' por ela que o reembolso encontra a linha
  tipo                 text not null,             -- 'assinatura' | 'pix'
  user_id              uuid,                      -- sem FK: conta apagada nao pode apagar a receita
  plano                text,
  moeda                text not null,             -- 'brl' quase sempre; guardado porque nao e' garantido
  bruto_centavos       bigint not null,
  taxa_centavos        bigint,                    -- null = o Stripe ainda nao contou (ou faltou permissao)
  liquido_centavos     bigint,
  reembolsado_centavos bigint not null default 0,
  pago_em              timestamptz not null,
  evento               text,                      -- o tipo de evento que criou a linha, para depurar
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now()
);

comment on table admin_rf98.stripe_pagamentos is
 'Uma linha por cobranca paga no Stripe, escrita pelo webhook. A pagina de Financas soma por mes (stripe_receita_mes) e lanca receita e taxa.';

create index if not exists stripe_pagamentos_pago_em_idx
  on admin_rf98.stripe_pagamentos (pago_em);

-- o reembolso chega com o id da COBRANCA, nao com o da compra
create index if not exists stripe_pagamentos_cobranca_idx
  on admin_rf98.stripe_pagamentos (cobranca_id);

alter table admin_rf98.stripe_pagamentos enable row level security;
-- sem policy: leitura so' pela funcao security definer abaixo, escrita so' pelo service_role

-- O GRANT NAO E' DETALHE, E' O QUE FALTAVA. `service_role` tem `bypassrls`, e por
-- isso e' facil supor que ele alcanca qualquer tabela -- mas bypassrls pula a
-- POLICY, nao o GRANT. Sem esta linha, todo upsert do webhook e do backfill volta
-- "permission denied for table stripe_pagamentos": o backfill leu as 4 cobrancas
-- de setembro, gravou zero, e disse "0 importadas" sem parecer erro nenhum.
-- So' o service_role: a leitura do painel passa pela funcao security definer
-- abaixo, entao authenticated e anon nao precisam de nada aqui.
grant select, insert, update on admin_rf98.stripe_pagamentos to service_role;

-- ----------------------------------------------------------------------------
-- A SOMA E' TRABALHO DE BANCO, pelo mesmo motivo de ia_custos_mes(): `select()`
-- sem `range()` para em 1000 linhas sem avisar, e o painel somaria um pedaco da
-- receita sem erro nenhum na tela. Aqui volta uma linha por mes/moeda/tipo.
--
-- O MES E' EM UTC, como o da IA: os dois numeros do mesmo mes tem de ser cortados
-- no mesmo sitio, ou o fecho nunca bate.
-- ----------------------------------------------------------------------------
create or replace function admin_rf98.stripe_receita_mes()
returns table (mes text, moeda text, tipo text, n bigint,
               bruto numeric, taxa numeric, reembolso numeric, liquido numeric)
language plpgsql
security definer
set search_path = admin_rf98, public
as $$
begin
  if not admin_rf98.is_admin() then
    raise exception 'Só administradores do painel veem a receita' using errcode = '42501';
  end if;
  return query
    select to_char(p.pago_em at time zone 'UTC', 'YYYY-MM')::text,
           p.moeda::text,
           p.tipo::text,
           count(*)::bigint,
           sum(p.bruto_centavos)::numeric,
           sum(coalesce(p.taxa_centavos, 0))::numeric,
           sum(p.reembolsado_centavos)::numeric,
           sum(coalesce(p.liquido_centavos, p.bruto_centavos - coalesce(p.taxa_centavos, 0)))::numeric
      from admin_rf98.stripe_pagamentos p
     group by 1, 2, 3
     order by 1, 2, 3;
end $$;

revoke all on function admin_rf98.stripe_receita_mes() from public, anon;
grant execute on function admin_rf98.stripe_receita_mes() to authenticated;
