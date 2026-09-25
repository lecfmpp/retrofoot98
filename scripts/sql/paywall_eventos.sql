-- MEDIÇÃO DO PAYWALL DE TEMPORADA — 25/09/2026 (aplicado no banco em 25/09)
-- O jogo (rf26-paywall.js → NET.paywallEvento) registra: exibido, clicou_pro, abriu_depoimento,
-- abriu_post, fechou, seguiu_gratis, virou_pro — com a variante (bloqueio/ultima/beta), a situação
-- da temporada (titulo/acesso/quase/meio/rebaixado), divisão e ano. A liberação por depoimento/post
-- fica em elifoot_v3.temporadas_extras, e a assinatura no Stripe (stripe_pagamentos).
-- Leitura dos sócios: select * from admin_rf98.paywall_funil;  (pessoas distintas, não cliques)

create table if not exists elifoot_v3.paywall_eventos (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  save_name  text,
  evento     text not null check (evento in ('exibido','clicou_pro','abriu_depoimento','abriu_post','fechou','seguiu_gratis','virou_pro')),
  variante   text check (variante in ('bloqueio','ultima','beta')),
  situacao   text check (situacao in ('titulo','acesso','quase','meio','rebaixado')),
  divisao    text,
  temporada  int,
  criado_em  timestamptz not null default now()
);
create index if not exists paywall_eventos_quando on elifoot_v3.paywall_eventos (criado_em);
create index if not exists paywall_eventos_quem on elifoot_v3.paywall_eventos (user_id, evento);
alter table elifoot_v3.paywall_eventos enable row level security;   -- sem policies: só a função escreve

create or replace function elifoot_v3.rf_paywall_evento(p_evento text, p_save text default null, p_variante text default null,
                                                        p_situacao text default null, p_divisao text default null, p_temporada int default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return; end if;
  -- o mesmo evento da mesma pessoa em menos de 5 s é clique repetido, não conta duas vezes
  if exists (select 1 from elifoot_v3.paywall_eventos e where e.user_id = auth.uid() and e.evento = p_evento
               and e.criado_em > now() - interval '5 seconds') then return; end if;
  insert into elifoot_v3.paywall_eventos (user_id, save_name, evento, variante, situacao, divisao, temporada)
  values (auth.uid(), left(p_save, 200), p_evento,
          case when p_variante in ('bloqueio','ultima','beta') then p_variante end,
          case when p_situacao in ('titulo','acesso','quase','meio','rebaixado') then p_situacao end,
          left(p_divisao, 8), p_temporada);
exception when others then null;   -- medir nunca pode atrapalhar o jogo
end $$;
revoke all on function elifoot_v3.rf_paywall_evento(text, text, text, text, text, int) from public, anon;
grant execute on function elifoot_v3.rf_paywall_evento(text, text, text, text, text, int) to authenticated;

create or replace view admin_rf98.paywall_funil as
select coalesce(e.variante, '—') variante, coalesce(e.situacao, '—') situacao,
       count(distinct e.user_id) filter (where e.evento = 'exibido')          viram,
       count(distinct e.user_id) filter (where e.evento = 'clicou_pro')       clicaram_pro,
       count(distinct e.user_id) filter (where e.evento = 'virou_pro')        viraram_pro,
       count(distinct e.user_id) filter (where e.evento = 'abriu_depoimento') abriram_depoimento,
       count(distinct e.user_id) filter (where e.evento = 'abriu_post')       abriram_post,
       count(distinct e.user_id) filter (where e.evento = 'seguiu_gratis')    seguiram_gratis,
       count(distinct e.user_id) filter (where e.evento = 'fechou')           fecharam
  from elifoot_v3.paywall_eventos e
 group by 1, 2;
revoke all on admin_rf98.paywall_funil from public, anon, authenticated;
