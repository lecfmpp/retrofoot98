-- ===== PERÍODO COM DATAS NO PAINEL (27/09/2026) =====
-- O seletor do topo do painel (7 dias / 30 dias / Ano) passou a aceitar também um intervalo de
-- datas (De / Até, calendário). As RPCs de Visão geral e Analytics ganham p_de / p_ate; sem eles,
-- continua valendo p_dias contando para trás a partir de HOJE.
--
-- Por que a Visão geral "não mudava": overview(p_dias) só usava o período no bloco de engajamento.
-- Agora devolve também, DO PERÍODO: novos cadastros, ativos, quem voltou em mais de um dia, tempo
-- jogado, receita/despesa e as categorias. Os campos antigos continuam iguais (Finanças lê
-- ativos7/meses/caixa/meta_lucro), exceto a janela de ativos7/retorno7, que era de 8 dias
-- (current_date - 7) e agora é de 7 dias de verdade.
--
-- Dias contados no fuso de Brasília — o painel escolhe as datas em dia local.

drop function if exists admin_rf98.overview(integer);
create or replace function admin_rf98.overview(p_dias integer default 30, p_de date default null, p_ate date default null)
returns jsonb language plpgsql stable security definer set search_path to 'admin_rf98', 'public' as $function$
declare v jsonb;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_fim  date := coalesce(p_ate, p_de, (now() at time zone 'America/Sao_Paulo')::date);
  v_ini  date := coalesce(p_de, coalesce(p_ate, (now() at time zone 'America/Sao_Paulo')::date) - (greatest(coalesce(p_dias,30),1) - 1));
  v_t    date;
begin
  perform admin_rf98.exigir_admin();
  if v_ini > v_fim then v_t := v_ini; v_ini := v_fim; v_fim := v_t; end if;
  with contas as (select id, created_at, last_sign_in_at from auth.users),
  atividade as (select user_id, sum(minutos) minutos from elifoot_v3.user_activity group by user_id),
  ativo_dia as (select user_id, dia, minutos from elifoot_v3.user_activity
                 where (interacoes > 0 or (dia < date '2026-09-26' and minutos > 0))),
  ativos7 as (select count(distinct user_id) n from ativo_dia where dia >= v_hoje - 6),
  retorno as (select count(*) n from (select user_id from ativo_dia where dia >= v_hoje - 6
      group by user_id having count(distinct dia) > 1) x),
  per_ativos as (select user_id, count(distinct dia) dias from ativo_dia where dia between v_ini and v_fim group by user_id),
  per_min as (select user_id, sum(minutos) m from elifoot_v3.user_activity where dia between v_ini and v_fim group by user_id having sum(minutos) > 0),
  per_lanc as (select l.tipo, l.categoria, l.valor_centavos from admin_rf98.adm_lancamentos l where l.data between v_ini and v_fim),
  meses as (
    select to_char(m,'YYYY-MM') ym, to_char(m,'Mon') rotulo,
           coalesce(sum(l.valor_centavos) filter (where l.tipo='receita'),0) receita,
           coalesce(sum(l.valor_centavos) filter (where l.tipo='despesa'),0) despesa
      from generate_series(date_trunc('month', current_date) - interval '5 months',
                           date_trunc('month', current_date), interval '1 month') m
      left join admin_rf98.adm_lancamentos l on date_trunc('month', l.data) = m
     group by m order by m),
  cats_rec as (select l.categoria, sum(l.valor_centavos) total from admin_rf98.adm_lancamentos l
     where l.tipo='receita' and date_trunc('month', l.data)=date_trunc('month', current_date)
     group by l.categoria order by 2 desc),
  cats_desp as (select l.categoria, sum(l.valor_centavos) total from admin_rf98.adm_lancamentos l
     where l.tipo='despesa' and date_trunc('month', l.data)=date_trunc('month', current_date)
     group by l.categoria order by 2 desc),
  pontos as (
    select user_id, sum(pts) pts, max(tecnico) tecnico, max(clube) clube from (
      select s.user_id, coalesce((s.state->'S'->'table'->(s.state->>'clubId')->>'Pts')::int,0) pts,
             s.state->>'mgr' tecnico, s.state->>'clubId' clube from elifoot_v3.solo_saves s
      union all
      select gs.user_id, coalesce((g.shared_state->'S'->'table'->gs.club_id->>'Pts')::int,0), gs.name, gs.club_id
        from elifoot_v3.game_seats gs join elifoot_v3.games g on g.id=gs.game_id
       where gs.user_id is not null and g.phase <> 'deleted'
    ) x where user_id is not null group by user_id),
  engaj as (select
      (select count(*) from elifoot_v3.games where (created_at at time zone 'America/Sao_Paulo')::date between v_ini and v_fim and phase <> 'deleted') salas,
      (select count(*) from elifoot_v3.solo_saves where (updated_at at time zone 'America/Sao_Paulo')::date between v_ini and v_fim) solos,
      (select count(*) from elifoot_v3.room_invites where (created_at at time zone 'America/Sao_Paulo')::date between v_ini and v_fim) convites,
      (select count(*) from elifoot_v3.game_seats gs where gs.user_id is not null and (gs.joined_at at time zone 'America/Sao_Paulo')::date between v_ini and v_fim) assentos)
  select jsonb_build_object(
    'usuarios',(select count(*) from contas),
    'ativos7',(select n from ativos7),
    'minutos_total', coalesce((select sum(minutos) from atividade),0),
    'minutos_medio', coalesce((select round(avg(minutos)) from atividade),0),
    'meses',(select coalesce(jsonb_agg(jsonb_build_object('ym',ym,'rotulo',rotulo,'receita',receita,
              'despesa',despesa,'lucro',receita-despesa)),'[]'::jsonb) from meses),
    'cats_receita',(select coalesce(jsonb_agg(jsonb_build_object('nome',categoria,'valor',total)),'[]'::jsonb) from cats_rec),
    'cats_despesa',(select coalesce(jsonb_agg(jsonb_build_object('nome',categoria,'valor',total)),'[]'::jsonb) from cats_desp),
    'ranking',(select coalesce(jsonb_agg(r),'[]'::jsonb) from (
        select jsonb_build_object('tecnico',coalesce(tecnico,'—'),'clube',coalesce(clube,'—'),'pontos',pts) r
          from pontos order by pts desc limit 8) z),
    'engajamento',(select to_jsonb(e) from engaj e),
    'retorno7',(select n from retorno),
    'meta_lucro', coalesce((select (valor#>>'{}')::bigint from admin_rf98.adm_config where chave='meta_lucro_centavos'),0),
    'caixa', coalesce((select (valor#>>'{}')::bigint from admin_rf98.adm_config where chave='caixa_centavos'),0),
    -- DO PERÍODO ESCOLHIDO
    'periodo', jsonb_build_object('de', v_ini, 'ate', v_fim, 'dias', v_fim - v_ini + 1),
    'novos_per', (select count(*) from contas where (created_at at time zone 'America/Sao_Paulo')::date between v_ini and v_fim),
    'ativos_per', (select count(*) from per_ativos),
    'retorno_per', (select count(*) from per_ativos where dias > 1),
    'minutos_per', coalesce((select sum(m) from per_min),0),
    'minutos_medio_per', coalesce((select round(avg(m)) from per_min),0),
    'receita_per', coalesce((select sum(valor_centavos) from per_lanc where tipo='receita'),0),
    'despesa_per', coalesce((select sum(valor_centavos) from per_lanc where tipo='despesa'),0),
    'cats_receita_per',(select coalesce(jsonb_agg(jsonb_build_object('nome',categoria,'valor',t) order by t desc),'[]'::jsonb)
        from (select categoria, sum(valor_centavos) t from per_lanc where tipo='receita' group by categoria) x),
    'cats_despesa_per',(select coalesce(jsonb_agg(jsonb_build_object('nome',categoria,'valor',t) order by t desc),'[]'::jsonb)
        from (select categoria, sum(valor_centavos) t from per_lanc where tipo='despesa' group by categoria) x)
  ) into v;
  return v;
end $function$;
revoke all on function admin_rf98.overview(integer, date, date) from anon;
grant execute on function admin_rf98.overview(integer, date, date) to authenticated;

drop function if exists admin_rf98.analytics(integer);
create or replace function admin_rf98.analytics(p_dias integer default 14, p_de date default null, p_ate date default null)
returns jsonb language plpgsql stable security definer set search_path to 'admin_rf98', 'public' as $function$
declare v jsonb;
  v_fim date := coalesce(p_ate, p_de, (now() at time zone 'America/Sao_Paulo')::date);
  v_ini date := coalesce(p_de, coalesce(p_ate, (now() at time zone 'America/Sao_Paulo')::date) - (greatest(coalesce(p_dias,14),1) - 1));
  v_t   date;
begin
  perform admin_rf98.exigir_admin();
  if v_ini > v_fim then v_t := v_ini; v_ini := v_fim; v_fim := v_t; end if;
  if v_fim - v_ini > 730 then v_ini := v_fim - 730; end if;   -- teto de 2 anos no gráfico diário
  with dias as (select d::date dia from generate_series(v_ini, v_fim, interval '1 day') d),
  contas as (select (created_at at time zone 'America/Sao_Paulo')::date dia, count(*) n from auth.users
              where (created_at at time zone 'America/Sao_Paulo')::date between v_ini and v_fim group by 1),
  sessoes as (select dia, count(distinct user_id) n from elifoot_v3.user_activity
               where dia between v_ini and v_fim and (interacoes > 0 or (dia < date '2026-09-26' and minutos > 0)) group by dia),
  unicos as (select count(distinct user_id) n from elifoot_v3.user_activity
               where dia between v_ini and v_fim and (interacoes > 0 or (dia < date '2026-09-26' and minutos > 0))),
  -- so' quem TEM linha de plano entra aqui; conta sem linha e' Peladeiro e nunca
  -- e' paga, entao a varredura fica do tamanho da base de assinantes
  planos as (select pl.plan from elifoot_v3.user_plans up
               join auth.users u on u.id = up.user_id
               join lateral elifoot_v3.plano_limites(up.user_id) pl on true),
  funil as (select (select count(*) from auth.users) contas,
      (select count(distinct x.user_id) from (
         select user_id from elifoot_v3.solo_saves where user_id is not null
         union select user_id from elifoot_v3.game_seats where user_id is not null) x
        join auth.users u on u.id = x.user_id) jogaram,
      (select count(*) from planos where plan <> 'free') pagos,
      (select count(*) from planos where plan = 'resenha') resenha,
      (select count(*) from planos where plan = 'embaixador') embaixador)
  select jsonb_build_object(
    'dias',(select coalesce(jsonb_agg(jsonb_build_object('dia',d.dia,'sessoes',coalesce(s.n,0),
              'contas',coalesce(c.n,0)) order by d.dia),'[]'::jsonb)
            from dias d left join contas c on c.dia=d.dia left join sessoes s on s.dia=d.dia),
    'ativos_unicos', (select n from unicos),
    'periodo', jsonb_build_object('de', v_ini, 'ate', v_fim),
    'funil',(select to_jsonb(f) from funil f),
    'ga4',(select valor from admin_rf98.adm_config where chave='ga4_snapshot')
  ) into v;
  return v;
end $function$;
revoke all on function admin_rf98.analytics(integer, date, date) from anon;
grant execute on function admin_rf98.analytics(integer, date, date) to authenticated;
