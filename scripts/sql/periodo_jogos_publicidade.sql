-- ===== PERÍODO EM JOGOS E PUBLICIDADE (27/09/2026) =====
-- Continuação de periodo_datas.sql: as duas páginas tinham janela fixa de 30 dias. Agora recebem o
-- período do topo do painel (p_dias contando de hoje, ou p_de / p_ate), em dias de Brasília.
--
-- jogos: os NÚMEROS do período (salas criadas, saves com atividade, convites e pedidos) e as listas
--   de convites/pedidos seguem o período. As listas de salas abertas e de saves NÃO — são o estado
--   atual, usado para limpeza; filtrá-las esconderia justamente as salas paradas há muito tempo.
-- publicidade: impressões e cliques (total e por espaço) do período. Os campos imp30/clq30
--   continuam existindo e agora trazem o valor DO PERÍODO (mesmo nome, para não quebrar leitura).
-- As versões sem parâmetro são apagadas: jogos() e jogos(p_dias default...) juntas deixariam a
-- chamada sem argumentos ambígua.

drop function if exists admin_rf98.jogos();
create or replace function admin_rf98.jogos(p_dias integer default 30, p_de date default null, p_ate date default null)
returns jsonb language plpgsql stable security definer set search_path to 'admin_rf98', 'public' as $function$
declare v jsonb;
  v_fim date := coalesce(p_ate, p_de, (now() at time zone 'America/Sao_Paulo')::date);
  v_ini date := coalesce(p_de, coalesce(p_ate, (now() at time zone 'America/Sao_Paulo')::date) - (greatest(coalesce(p_dias,30),1) - 1));
  v_t date; t_ini timestamptz; t_fim timestamptz;
begin
  perform admin_rf98.exigir_admin();
  if v_ini > v_fim then v_t := v_ini; v_ini := v_fim; v_fim := v_t; end if;
  t_ini := v_ini::timestamp at time zone 'America/Sao_Paulo';
  t_fim := (v_fim + 1)::timestamp at time zone 'America/Sao_Paulo';
  with salas as (
    select g.id, g.name, g.phase, g.created_at, g.updated_at, g.round, g.season,
           coalesce(h.nome_host,'anfitrião') anfitriao,
           (select count(*) from elifoot_v3.game_seats s where s.game_id=g.id and s.user_id is not null) humanos,
           (select count(*) from elifoot_v3.game_seats s where s.game_id=g.id) lugares
      from elifoot_v3.games g
      left join lateral (select coalesce(s.name, split_part(u.email,'@',1)) nome_host
          from elifoot_v3.game_seats s left join auth.users u on u.id=g.host_id
         where s.game_id=g.id and s.user_id=g.host_id limit 1) h on true
     where g.phase <> 'deleted' order by g.created_at desc limit 200),
  conv_per as (
    select ri.game_id, ri.user_id, ri.created_at, u.email destino,
           case when exists (select 1 from elifoot_v3.game_seats s
                              where s.game_id=ri.game_id and s.user_id=ri.user_id) then 'aceito'
                when ri.created_at > now() - interval '48 hours' then 'pendente'
                else 'expirado' end estado
      from elifoot_v3.room_invites ri left join auth.users u on u.id=ri.user_id
     where ri.created_at >= t_ini and ri.created_at < t_fim),
  convites as (select * from conv_per order by created_at desc limit 200),
  pedidos as (
    select jr.game_id, jr.created_at, jr.name destino, jr.status,
           case when jr.status in ('aprovado','accepted') then 'aceito'
                when jr.created_at > now() - interval '48 hours' then 'pendente'
                else 'expirado' end estado
      from elifoot_v3.join_requests jr
     where jr.created_at >= t_ini and jr.created_at < t_fim order by jr.created_at desc limit 200),
  solos as (
    select s.user_id, s.save_name, s.updated_at, s.state->>'mgr' tecnico, s.state->>'clubId' clube,
           s.state->'S'->>'division' divisao, s.state->'S'->>'season' temporada, u.email dono
      from elifoot_v3.solo_saves s left join auth.users u on u.id = s.user_id
     order by s.updated_at desc limit 500),
  -- uma linha por JOGADOR, com quantos saves ele tem
  solo_por_usuario as (
    select s.user_id, u.email dono,
           coalesce(max(s.state->>'mgr'), split_part(u.email,'@',1)) tecnico,
           count(*) saves,
           count(*) filter (where s.updated_at < now() - interval '14 days') parados,
           max(s.updated_at) ultimo,
           string_agg(distinct s.state->'S'->>'division', ', ' order by s.state->'S'->>'division') divisoes
      from elifoot_v3.solo_saves s left join auth.users u on u.id = s.user_id
     group by s.user_id, u.email order by count(*) desc, max(s.updated_at) desc)
  select jsonb_build_object(
    'salas',    (select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from salas s),
    'convites', (select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from convites c),
    'pedidos',  (select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from pedidos p),
    'solos',    (select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from solos x),
    'solo_usuarios', (select coalesce(jsonb_agg(to_jsonb(y)),'[]'::jsonb) from solo_por_usuario y),
    'solos_parados', (select count(*) from elifoot_v3.solo_saves where updated_at < now() - interval '14 days'),
    'salas_vazias',  (select count(*) from elifoot_v3.games g where g.phase <> 'deleted'
                       and not exists (select 1 from elifoot_v3.game_seats s
                                        where s.game_id=g.id and s.user_id is not null)),
    -- DO PERÍODO
    'periodo', jsonb_build_object('de', v_ini, 'ate', v_fim),
    'salas_criadas_per', (select count(*) from elifoot_v3.games g where g.phase <> 'deleted' and g.created_at >= t_ini and g.created_at < t_fim),
    'salas_ativas_per',  (select count(*) from elifoot_v3.games g where g.phase <> 'deleted' and g.updated_at >= t_ini and g.updated_at < t_fim),
    'saves_per',         (select count(*) from elifoot_v3.solo_saves s where s.updated_at >= t_ini and s.updated_at < t_fim),
    'jogadores_solo_per',(select count(distinct s.user_id) from elifoot_v3.solo_saves s where s.updated_at >= t_ini and s.updated_at < t_fim),
    'convites_per',      (select count(*) from conv_per),
    'aceitos_per',       (select count(*) from conv_per where estado = 'aceito')
  ) into v;
  return v;
end $function$;
revoke all on function admin_rf98.jogos(integer, date, date) from anon;
grant execute on function admin_rf98.jogos(integer, date, date) to authenticated;

drop function if exists admin_rf98.publicidade();
create or replace function admin_rf98.publicidade(p_dias integer default 30, p_de date default null, p_ate date default null)
returns jsonb language plpgsql stable security definer set search_path to 'admin_rf98', 'public' as $function$
declare v jsonb;
  v_fim date := coalesce(p_ate, p_de, (now() at time zone 'America/Sao_Paulo')::date);
  v_ini date := coalesce(p_de, coalesce(p_ate, (now() at time zone 'America/Sao_Paulo')::date) - (greatest(coalesce(p_dias,30),1) - 1));
  v_t date; t_ini timestamptz; t_fim timestamptz;
begin
  perform admin_rf98.exigir_admin();
  if v_ini > v_fim then v_t := v_ini; v_ini := v_fim; v_fim := v_t; end if;
  t_ini := v_ini::timestamp at time zone 'America/Sao_Paulo';
  t_fim := (v_fim + 1)::timestamp at time zone 'America/Sao_Paulo';
  with stats as (select chave,
      count(*) filter (where tipo='impressao') imp30,
      count(*) filter (where tipo='clique')    clq30
      from elifoot_v3.ad_events where criado_em >= t_ini and criado_em < t_fim group by chave),
  espacos as (
    select e.*, coalesce(s.imp30,0) impressoes, coalesce(s.clq30,0) cliques,
           /* o criativo do espaço inteiro (posicao nula) — é assim que funcionam
              todos os espaços menos os de placas */
           (select to_jsonb(c) from (
              select cr.id, cr.ficheiro_url, cr.link_destino, cr.no_ar_ate, cr.mime, cr.bytes,
                     cr.criado_em, cr.cta_texto, cr.cta_bg, cr.cta_fg,
                     cr.ficheiro_url_mob, cr.mime_mob, cr.bytes_mob, p.nome patrocinador
                from elifoot_v3.ad_creatives cr
                left join admin_rf98.adm_patrocinadores p on p.id = cr.patrocinador_id
               where cr.chave_espaco = e.chave and cr.ativo and cr.posicao is null
                 and cr.no_ar_de <= now() and (cr.no_ar_ate is null or cr.no_ar_ate >= now())
               order by cr.criado_em desc limit 1) c) criativo,
           /* UMA PLACA POR LINHA, para os espaços que têm placas independentes.
              Vem sempre (lista vazia quando não há placas) para o painel não ter
              de adivinhar se o campo existe. */
           (select coalesce(jsonb_agg(to_jsonb(c) order by (c).posicao), '[]'::jsonb) from (
              select distinct on (cr.posicao)
                     cr.id, cr.posicao, cr.ficheiro_url, cr.link_destino, cr.no_ar_ate,
                     cr.mime, cr.bytes, cr.criado_em, p.nome patrocinador
                from elifoot_v3.ad_creatives cr
                left join admin_rf98.adm_patrocinadores p on p.id = cr.patrocinador_id
               where cr.chave_espaco = e.chave and cr.ativo and cr.posicao is not null
                 and cr.no_ar_de <= now() and (cr.no_ar_ate is null or cr.no_ar_ate >= now())
               order by cr.posicao, cr.criado_em desc) c) criativos
      from elifoot_v3.ad_spaces e left join stats s on s.chave = e.chave order by e.ord)
  select jsonb_build_object(
    'espacos',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from espacos x),
    'patrocinadores',(select coalesce(jsonb_agg(to_jsonb(p) order by p.criado_em desc),'[]'::jsonb)
                        from admin_rf98.adm_patrocinadores p),
    'imp30',(select coalesce(sum(imp30),0) from stats),
    'clq30',(select coalesce(sum(clq30),0) from stats),
    'periodo', jsonb_build_object('de', v_ini, 'ate', v_fim),
    'receita_mes', coalesce((select sum(valor_mes_centavos) from admin_rf98.adm_patrocinadores
                              where estado in ('ativo','a_renovar','programatico')),0)
  ) into v;
  return v;
end $function$;
revoke all on function admin_rf98.publicidade(integer, date, date) from anon;
grant execute on function admin_rf98.publicidade(integer, date, date) to authenticated;
notify pgrst, 'reload schema';
