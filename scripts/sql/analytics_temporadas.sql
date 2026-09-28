-- ===== ANALYTICS: TEMPORADAS COMPLETAS POR PESSOA (27/09/2026) =====
-- Mesma função de analytics_funil_paywall_churn.sql, com o bloco 'temporadas': quantas pessoas
-- (sem os sócios) completaram exatamente 1, 2, 3 temporadas, e 3+, 4+, 5+, 10+. Soma das temporadas
-- FECHADAS de todas as carreiras da pessoa (Solo: solo_saves.temporadas_fechadas; Resenha: histórico
-- do assento). Total da vida da conta — não segue o período. 'jogaram' = quem tem save ou assento.

create or replace function admin_rf98.analytics(p_dias integer default 14, p_de date default null, p_ate date default null)
returns jsonb language plpgsql stable security definer set search_path to 'admin_rf98', 'public' as $function$
declare v jsonb;
  v_fim date := coalesce(p_ate, p_de, (now() at time zone 'America/Sao_Paulo')::date);
  v_ini date := coalesce(p_de, coalesce(p_ate, (now() at time zone 'America/Sao_Paulo')::date) - (greatest(coalesce(p_dias,14),1) - 1));
  v_t date; t_ini timestamptz; t_fim timestamptz;
begin
  perform admin_rf98.exigir_admin();
  if v_ini > v_fim then v_t := v_ini; v_ini := v_fim; v_fim := v_t; end if;
  if v_fim - v_ini > 730 then v_ini := v_fim - 730; end if;
  t_ini := v_ini::timestamp at time zone 'America/Sao_Paulo';
  t_fim := (v_fim + 1)::timestamp at time zone 'America/Sao_Paulo';
  with socios as (select user_id from admin_rf98.adm_users where papel = 'socio' and user_id is not null),
  dias as (select d::date dia from generate_series(v_ini, v_fim, interval '1 day') d),
  contas as (select (created_at at time zone 'America/Sao_Paulo')::date dia, count(*) n from auth.users
              where (created_at at time zone 'America/Sao_Paulo')::date between v_ini and v_fim group by 1),
  sessoes as (select dia, count(distinct user_id) n from elifoot_v3.user_activity
               where dia between v_ini and v_fim and (interacoes > 0 or (dia < date '2026-09-26' and minutos > 0)) group by dia),
  unicos as (select count(distinct user_id) n from elifoot_v3.user_activity
               where dia between v_ini and v_fim and (interacoes > 0 or (dia < date '2026-09-26' and minutos > 0))),
  planos as (select up.user_id, pl.plan from elifoot_v3.user_plans up
               join auth.users u on u.id = up.user_id
               join lateral elifoot_v3.plano_limites(up.user_id) pl on true
              where up.user_id not in (select user_id from socios)),
  funil as (select
      (select count(*) from auth.users where id not in (select user_id from socios)) contas,
      (select count(distinct x.user_id) from (
         select user_id from elifoot_v3.solo_saves where user_id is not null
         union select user_id from elifoot_v3.game_seats where user_id is not null) x
        join auth.users u on u.id = x.user_id where x.user_id not in (select user_id from socios)) jogaram,
      (select count(distinct user_id) from elifoot_v3.paywall_eventos where evento = 'exibido' and user_id not in (select user_id from socios)) viram_paywall,
      (select count(distinct user_id) from elifoot_v3.temporadas_extras where tipo = 'depoimento' and user_id not in (select user_id from socios)) depoimento,
      (select count(distinct user_id) from elifoot_v3.temporadas_extras where tipo = 'post' and user_id not in (select user_id from socios)) post,
      (select count(*) from planos where plan <> 'free') pagos),
  pagantes as (
    select x.user_id,
           coalesce((select pl.plan from elifoot_v3.plano_limites(x.user_id) pl), 'free') plano_hoje,
           (select case when up.plan = 'free' then up.updated_at
                        when up.until is not null and up.until <= now() then up.until end
              from elifoot_v3.user_plans up where up.user_id = x.user_id) saiu_em
      from (select user_id from admin_rf98.stripe_pagamentos where user_id is not null and bruto_centavos > 0
            union select user_id from elifoot_v3.user_plans where source like 'stripe%') x
     where x.user_id not in (select user_id from socios)),
  reemb as (select sp.* from admin_rf98.stripe_pagamentos sp
             where sp.reembolsado_centavos > 0 and (sp.user_id is null or sp.user_id not in (select user_id from socios))),
  stripe as (select
      (select count(*) from pagantes) pagaram,
      (select count(*) from pagantes where plano_hoje <> 'free') seguem_pro,
      (select count(*) from pagantes where plano_hoje = 'free') cancelaram,
      (select count(*) from pagantes where plano_hoje = 'free' and saiu_em >= t_ini and saiu_em < t_fim) cancelaram_per,
      (select count(*) from reemb) reembolsos,
      (select coalesce(sum(reembolsado_centavos),0) from reemb) reembolsado_centavos,
      (select count(*) from reemb where atualizado_em >= t_ini and atualizado_em < t_fim) reembolsos_per,
      (select coalesce(sum(reembolsado_centavos),0) from reemb where atualizado_em >= t_ini and atualizado_em < t_fim) reembolsado_per_centavos,
      (select coalesce(sum(bruto_centavos),0) from admin_rf98.stripe_pagamentos
        where user_id is null or user_id not in (select user_id from socios)) bruto_centavos),
  temporadas as (
    select user_id, sum(t) t from (
      select s.user_id, coalesce(s.temporadas_fechadas,0) t from elifoot_v3.solo_saves s where s.user_id is not null
      union all
      select gs.user_id, coalesce(elifoot_v3._len(gs.career->'history'),0)
        from elifoot_v3.game_seats gs join elifoot_v3.games g on g.id = gs.game_id and g.phase <> 'deleted'
       where gs.user_id is not null) x
     where user_id not in (select user_id from socios) group by user_id),
  temp as (select
      (select count(*) from temporadas where t = 1) t1,
      (select count(*) from temporadas where t = 2) t2,
      (select count(*) from temporadas where t = 3) t3,
      (select count(*) from temporadas where t >= 3) t3m,
      (select count(*) from temporadas where t >= 4) t4m,
      (select count(*) from temporadas where t >= 5) t5m,
      (select count(*) from temporadas where t >= 10) t10m,
      (select count(*) from temporadas where t >= 1) alguma,
      (select count(*) from temporadas) jogaram)
  select jsonb_build_object(
    'temporadas',(select to_jsonb(tp) from temp tp),
    'dias',(select coalesce(jsonb_agg(jsonb_build_object('dia',d.dia,'sessoes',coalesce(s.n,0),
              'contas',coalesce(c.n,0)) order by d.dia),'[]'::jsonb)
            from dias d left join contas c on c.dia=d.dia left join sessoes s on s.dia=d.dia),
    'ativos_unicos', (select n from unicos),
    'periodo', jsonb_build_object('de', v_ini, 'ate', v_fim),
    'funil',(select to_jsonb(f) from funil f),
    'stripe',(select to_jsonb(s) from stripe s),
    'ga4',(select valor from admin_rf98.adm_config where chave='ga4_snapshot')
  ) into v;
  return v;
end $function$;
