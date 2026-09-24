-- =====================================================================
-- RANKING v2 (23/09/2026): quem joga mais sobe, a copa pontua, e o ranking
-- ganha Dia / Semana / Mês.
--
-- O PESO CONTINUA A SER DO CLIENTE. Nada aqui calcula pontos de título nem de
-- temporada — a regra vive em core.js (pontosDeTituloRanking /
-- pontosDeTemporadaRanking). O servidor só guarda, soma e compara fotografias.
--
-- 1. `regra` nas duas tabelas do livro + `pts_copa` nas temporadas.
-- 2. A TRAVA DA REGRA: uma linha v2 só é sobrescrita por outra v2. Um cliente
--    antigo em cache (sem `regra`) não desfaz a escala nova de ninguém; linha
--    nova dele entra com regra nula e é corrigida no próximo envio do cliente
--    novo.
-- 3. A FOTO DIÁRIA (coach_ranking_dia): o total de cada treinador (Solo +
--    Resenha, o mesmo "geral" que o ranking mostra) às 00:05 de Brasília. Os
--    rankings por período são "total agora − total na foto do início do
--    período". Substitui a foto semanal, que tinha dois defeitos: contava só a
--    Resenha (o ranking é geral desde 03/09) e não correu a 21/09.
--
-- Reverter: drop das colunas novas, drop de coach_ranking_dia e rf_fechar_dia,
-- recriar rf_ranking(text,int) e os dois registrar a partir do git (commit
-- anterior a este ficheiro), e reagendar elifoot-ranking-semana.
-- =====================================================================

alter table elifoot_v3.coach_titles  add column if not exists regra text;
alter table elifoot_v3.coach_seasons add column if not exists regra text,
                                     add column if not exists pts_copa integer;

create or replace function elifoot_v3.rf_registrar_titulos(p_modo text, p_origem text, p_treinador text, p_titulos jsonb)
 returns integer
 language plpgsql
 security definer
 set search_path to 'elifoot_v3', 'public'
as $function$
declare v_n integer := 0;
begin
  if auth.uid() is null then raise exception 'sem sessão'; end if;
  if p_modo not in ('solo','resenha') then raise exception 'modo inválido: %', p_modo; end if;
  if p_origem is null or p_origem = '' then raise exception 'origem vazia'; end if;
  if jsonb_typeof(p_titulos) <> 'array' then return 0; end if;

  insert into elifoot_v3.coach_titles
    (user_id, modo, origem, treinador, temporada, comp, uni, div, club_id, club_short, pontos, regra)
  select auth.uid(), p_modo, p_origem, nullif(p_treinador,''),
         (e->>'season')::int, e->>'comp', e->>'uni', e->>'div',
         e->>'clubId', e->>'clubShort',
         case when e ? 'pontos' then (e->>'pontos')::numeric else null end,
         nullif(e->>'regra','')
    from jsonb_array_elements(p_titulos) e
   where e->>'comp' is not null
     and (e->>'season') ~ '^[0-9]+$'
  on conflict on constraint coach_titles_unico do update
     -- o reenvio ATUALIZA o nome e o peso; o peso só troca de escala para cima
     -- (ver A TRAVA DA REGRA no cabeçalho).
     set treinador = coalesce(excluded.treinador, elifoot_v3.coach_titles.treinador),
         pontos    = case when excluded.regra = 'v2' or elifoot_v3.coach_titles.regra is distinct from 'v2'
                          then coalesce(excluded.pontos, elifoot_v3.coach_titles.pontos)
                          else elifoot_v3.coach_titles.pontos end,
         regra     = case when excluded.regra = 'v2' then 'v2' else elifoot_v3.coach_titles.regra end,
         club_short= coalesce(excluded.club_short,elifoot_v3.coach_titles.club_short);

  get diagnostics v_n = row_count;
  return v_n;
end $function$;

create or replace function elifoot_v3.rf_registrar_temporadas(p_modo text, p_origem text, p_treinador text, p_temporadas jsonb)
 returns integer
 language plpgsql
 security definer
 set search_path to 'elifoot_v3', 'public'
as $function$
declare v_n integer := 0;
begin
  if auth.uid() is null then raise exception 'sem sessão'; end if;
  if p_modo not in ('solo','resenha') then raise exception 'modo inválido: %', p_modo; end if;
  if p_origem is null or p_origem = '' then raise exception 'origem vazia'; end if;
  if jsonb_typeof(p_temporadas) <> 'array' then return 0; end if;

  insert into elifoot_v3.coach_seasons
    (user_id, modo, origem, treinador, temporada, divisao, uni, posicao, pts_liga, pts_copa, pontos, regra)
  select auth.uid(), p_modo, p_origem, nullif(p_treinador,''),
         (e->>'season')::int, e->>'div', e->>'uni',
         nullif(e->>'pos','')::int, nullif(e->>'ptsLiga','')::int, nullif(e->>'ptsCopa','')::int,
         case when e ? 'pontos' then (e->>'pontos')::numeric else null end,
         nullif(e->>'regra','')
    from jsonb_array_elements(p_temporadas) e
   where (e->>'season') ~ '^[0-9]+$'
  on conflict on constraint coach_seasons_unico do update
     set treinador = coalesce(excluded.treinador, elifoot_v3.coach_seasons.treinador),
         pontos    = case when excluded.regra = 'v2' or elifoot_v3.coach_seasons.regra is distinct from 'v2'
                          then coalesce(excluded.pontos, elifoot_v3.coach_seasons.pontos)
                          else elifoot_v3.coach_seasons.pontos end,
         regra     = case when excluded.regra = 'v2' then 'v2' else elifoot_v3.coach_seasons.regra end,
         pts_liga  = coalesce(excluded.pts_liga,  elifoot_v3.coach_seasons.pts_liga),
         pts_copa  = coalesce(excluded.pts_copa,  elifoot_v3.coach_seasons.pts_copa),
         posicao   = coalesce(excluded.posicao,   elifoot_v3.coach_seasons.posicao),
         divisao   = coalesce(excluded.divisao,   elifoot_v3.coach_seasons.divisao);
  get diagnostics v_n = row_count;
  return v_n;
end $function$;

-- ---------- a foto diária ----------
create table if not exists elifoot_v3.coach_ranking_dia (
  dia          date    not null,
  user_id      uuid    not null,
  pos          integer not null,
  pontos       numeric not null,
  pts_titulos  numeric not null,
  pts_campanha numeric not null,
  titulos      integer not null,
  temporadas   integer not null,
  criado_em    timestamptz not null default now(),
  primary key (dia, user_id)
);
alter table elifoot_v3.coach_ranking_dia enable row level security;
revoke all on elifoot_v3.coach_ranking_dia from public, anon, authenticated;

-- O dia é o de Brasília: a foto das 00:05 é o "começo do dia" para quem joga.
-- Idempotente (do nothing): correr duas vezes no mesmo dia não mexe na base.
create or replace function elifoot_v3.rf_fechar_dia()
 returns integer
 language plpgsql
 security definer
 set search_path to 'elifoot_v3', 'public'
as $function$
declare v_dia date := (now() at time zone 'America/Sao_Paulo')::date; v_n integer := 0;
begin
  insert into elifoot_v3.coach_ranking_dia
    (dia, user_id, pos, pontos, pts_titulos, pts_campanha, titulos, temporadas)
  select v_dia, x.user_id, x.pos, x.total, x.pt, x.pc, x.nt, x.ns from (
    select b.*, (row_number() over (order by b.total desc, b.nt desc, b.ns desc, b.ultimo asc, b.user_id asc))::int pos
      from (
        select coalesce(t.user_id, s.user_id) user_id,
               coalesce(t.n,0)::int nt, coalesce(s.n,0)::int ns,
               coalesce(t.pts,0) pt, coalesce(s.pts,0) pc,
               coalesce(t.pts,0)+coalesce(s.pts,0) total,
               greatest(coalesce(t.quando, s.quando), coalesce(s.quando, t.quando)) ultimo
          from (select user_id, count(*) n, coalesce(sum(pontos),0) pts, max(criado_em) quando
                  from elifoot_v3.coach_titles group by user_id) t
          full outer join
               (select user_id, count(*) n, coalesce(sum(pontos),0) pts, max(criado_em) quando
                  from elifoot_v3.coach_seasons group by user_id) s
            on s.user_id = t.user_id
      ) b
  ) x
  on conflict (dia, user_id) do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end $function$;
revoke all on function elifoot_v3.rf_fechar_dia() from public, anon, authenticated;

-- ---------- o ranking, agora com período ----------
drop function if exists elifoot_v3.rf_ranking(text, integer);
create or replace function elifoot_v3.rf_ranking(p_modo text default 'geral', p_limite integer default 100, p_periodo text default 'sempre')
 returns table(pos integer, treinador text, titulos bigint, pts_titulos numeric, temporadas bigint, pts_campanha numeric, pontos numeric, carreiras bigint, ultimo timestamp with time zone, sem_peso bigint, foto text, club_id text, clube text, modo_save text, delta integer)
 language plpgsql
 security definer
 set search_path to 'elifoot_v3', 'public'
as $function$
declare
  v_m    text := coalesce(nullif(p_modo,''),'geral');
  v_p    text := coalesce(nullif(p_periodo,''),'sempre');
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_seg  date := date_trunc('week', v_hoje)::date;
  v_ini  date; v_base date; v_sem date;
begin
  if v_m not in ('geral','solo','resenha') then
    raise exception 'modo inválido: % (use geral, solo ou resenha)', v_m;
  end if;
  if v_p not in ('sempre','dia','semana','mes') then
    raise exception 'período inválido: % (use sempre, dia, semana ou mes)', v_p;
  end if;
  if v_p <> 'sempre' and v_m <> 'geral' then
    raise exception 'o ranking por período só existe no geral';
  end if;

  /* A FOTO QUE REPRESENTA O INÍCIO DE UM PERÍODO: a última tirada até esse dia;
     não havendo nenhuma (o período começou antes da primeira foto), a primeira
     depois dele — o período passa a contar dali. Um dia sem foto (cron que não
     correu) cai na véspera em vez de zerar a base de toda a gente. */
  v_ini := case v_p when 'dia' then v_hoje when 'semana' then v_seg
                    when 'mes' then date_trunc('month', v_hoje)::date end;
  if v_ini is not null then
    v_base := coalesce((select max(d.dia) from elifoot_v3.coach_ranking_dia d where d.dia <= v_ini),
                       (select min(d.dia) from elifoot_v3.coach_ranking_dia d where d.dia >  v_ini));
  end if;
  -- a setinha do "Sempre": posição agora contra a da foto da segunda-feira
  v_sem := coalesce((select max(d.dia) from elifoot_v3.coach_ranking_dia d where d.dia <= v_seg),
                    (select min(d.dia) from elifoot_v3.coach_ranking_dia d where d.dia >  v_seg));

  return query
  with tit as (
    select t.user_id, max(t.treinador) nome, count(*) n, coalesce(sum(t.pontos),0) pts,
           count(distinct t.origem) carreiras, max(t.criado_em) quando,
           count(*) filter (where t.pontos is null) sem_peso
      from elifoot_v3.coach_titles t
     where (v_m='geral' or t.modo = v_m) group by t.user_id
  ), tmp as (
    select c.user_id, max(c.treinador) nome, count(*) n, coalesce(sum(c.pontos),0) pts,
           count(distinct c.origem) carreiras, max(c.criado_em) quando
      from elifoot_v3.coach_seasons c
     where (v_m='geral' or c.modo = v_m) group by c.user_id
  ), base as (
    select coalesce(t.user_id, s.user_id) user_id,
           coalesce(nullif(coalesce(t.nome, s.nome),''),'Treinador') nome,
           coalesce(t.n,0) titulos, coalesce(t.pts,0) pts_titulos,
           coalesce(s.n,0) temporadas, coalesce(s.pts,0) pts_campanha,
           coalesce(t.pts,0) + coalesce(s.pts,0) total,
           greatest(coalesce(t.carreiras,0), coalesce(s.carreiras,0)) carreiras,
           greatest(coalesce(t.quando, s.quando), coalesce(s.quando, t.quando)) ultimo,
           coalesce(t.sem_peso,0) sem_peso
      from tit t full outer join tmp s on s.user_id = t.user_id
  ), per as (
    /* NO PERÍODO, TUDO É GANHO: total, títulos e temporadas menos o que a foto do
       início já tinha. Quem não estava na foto começou depois — ganhou tudo o que tem. */
    select b.user_id, b.nome,
           (b.titulos      - coalesce(f.titulos,0))::bigint      titulos,
           b.pts_titulos   - coalesce(f.pts_titulos,0)           pts_titulos,
           greatest(b.temporadas - coalesce(f.temporadas,0),0)::bigint temporadas,
           b.pts_campanha  - coalesce(f.pts_campanha,0)          pts_campanha,
           b.total         - coalesce(f.pontos,0)                total,
           b.carreiras, b.ultimo, b.sem_peso
      from base b
      left join elifoot_v3.coach_ranking_dia f
        on v_p <> 'sempre' and f.dia = v_base and f.user_id = b.user_id
     where v_p = 'sempre' or b.total - coalesce(f.pontos,0) > 0
  ), vis as (
    select v.* from per v
      left join elifoot_v3.coach_profiles pr on pr.user_id = v.user_id
     where coalesce(pr.no_ranking, true)
  ), ord as (
    select v.*, (row_number() over (order by v.total desc, v.titulos desc, v.temporadas desc,
                                             v.ultimo asc, v.user_id asc))::int p from vis v
  )
  select o.p, coalesce(nullif(u.mgr,''), o.nome), o.titulos, o.pts_titulos, o.temporadas,
         o.pts_campanha, o.total, o.carreiras, o.ultimo, o.sem_peso,
         (select pr2.foto_url from elifoot_v3.coach_profiles pr2 where pr2.user_id = o.user_id),
         u.club_id, u.clube, u.modo_save,
         case when v_p = 'sempre' and v_m = 'geral'
              then coalesce((select (w.pos - o.p) from elifoot_v3.coach_ranking_dia w
                              where w.dia = v_sem and w.user_id = o.user_id), 0)
              else 0 end::int
    from ord o
    left join lateral (
      select x.club_id, x.clube, x.modo_save, x.mgr from (
        select s.club_id, coalesce(s.club_short, s.club_id),
               'Solo'::text, s.updated_at, s.mgr
          from elifoot_v3.solo_saves s
         where s.user_id = o.user_id and s.club_id is not null
        union all
        select gs.club_id, gs.club_id, 'Resenha'::text, g.updated_at, null
          from elifoot_v3.game_seats gs join elifoot_v3.games g on g.id = gs.game_id
         where gs.user_id = o.user_id and gs.club_id is not null and g.phase <> 'deleted'
      ) x(club_id, clube, modo_save, quando, mgr) order by x.quando desc nulls last limit 1
    ) u on true
   order by o.p
   limit greatest(1, least(coalesce(p_limite,100), 500));
end $function$;
revoke all on function elifoot_v3.rf_ranking(text, integer, text) from public;
grant execute on function elifoot_v3.rf_ranking(text, integer, text) to anon, authenticated;

-- ---------- o relógio: a foto diária substitui a semanal ----------
select cron.unschedule('elifoot-ranking-semana')
 where exists (select 1 from cron.job where jobname = 'elifoot-ranking-semana');
select cron.schedule('elifoot-ranking-dia', '5 3 * * *', 'select elifoot_v3.rf_fechar_dia()');

-- ---------- aplicado a 23/09/2026 (migração ranking_v2_periodos) ----------
-- RECÁLCULO DO LIVRO: as 53 linhas de coach_titles e as 111 de coach_seasons foram
-- recalculadas NO NAVEGADOR, com pontosDeTituloRanking / pontosDeTemporadaRanking do
-- jogo (nunca com fórmula em SQL), a partir do que o livro guarda (comp/uni/div;
-- divisão/uni/posição/pts_liga). uni 'false'/nulo = 'brasil' (saves antigos gravaram
-- S.intlUniverse=false). Temporada FECHADA = sem pts_liga (só posição, veio do
-- histórico) ou não é a última da carreira; a última com pts_liga conta como em curso
-- (sem os +10) — o dono do save corrige ao gravar de novo. Copa das temporadas antigas
-- = 0 (o jogo nunca a guardou).
-- Backup de antes: elifoot_v3.bkp_coach_titles_20260923 e bkp_coach_seasons_20260923
-- (RLS ligado, sem grant). Desfazer os pesos:
--   update elifoot_v3.coach_titles t set pontos=b.pontos, regra=null
--     from elifoot_v3.bkp_coach_titles_20260923 b where b.id=t.id;
--   update elifoot_v3.coach_seasons s set pontos=b.pontos, regra=null
--     from elifoot_v3.bkp_coach_seasons_20260923 b where b.id=s.id;
-- A primeira foto diária (rf_fechar_dia) foi tirada logo depois do recálculo, para os
-- períodos começarem da escala nova.
