-- ============================================================
-- LIGACAO CONTA DO JOGO <-> CLIENTE DO STRIPE — RetroFoot98
-- Aplicado em 2026-08-30.
--
-- POR QUE EXISTE: sem guardar o customer, cada compra criaria um cliente NOVO
-- no Stripe para a mesma pessoa — historico partido, cartao salvo perdido, e o
-- portal de "gerir a minha assinatura" sem ter o que abrir.
--
-- O WEBHOOK NAO DEPENDE DELA para saber de quem e' a assinatura: o user_id vai
-- carimbado em subscription_data.metadata no checkout, e volta em todo evento.
-- Esta tabela e' o caminho de reserva (e o que o portal do cliente usa).
--
-- NINGUEM ESCREVE PELO CLIENTE. So' o service_role das edge functions toca aqui;
-- nao ha' policy de escrita, de proposito.
-- ============================================================

create table if not exists elifoot_v3.stripe_customers (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  customer_id text not null unique,
  criado_em   timestamptz not null default now()
);

alter table elifoot_v3.stripe_customers enable row level security;

drop policy if exists stripe_customers_ler_o_meu on elifoot_v3.stripe_customers;
create policy stripe_customers_ler_o_meu on elifoot_v3.stripe_customers
  for select using (user_id = auth.uid());

grant select on elifoot_v3.stripe_customers to authenticated;
