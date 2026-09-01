-- ============================================================
-- OS 7 DIAS DE RESENHA DO PELADEIRO — RetroFoot98
-- Aplicado em 2026-09-01 (migracao peladeiro_resenha_7_dias, ja no banco).
-- Copia versionada. Continuacao de user_plans_tiers.sql.
--
-- O plano gratis dava Modo Resenha sem prazo, "nas salas dos outros". Passa a
-- dar 7 dias, contados da CRIACAO DA CONTA -- nao da primeira sala. Foi decisao
-- do dono, e tem uma consequencia que vale escrever: quem cria conta e demora um
-- mes a experimentar o modo chega tarde. Em troca, a regra e' uma so' e nao
-- depende de descobrir quando a pessoa entrou pela primeira vez.
--
-- POR QUE O day_ack NAO E' O SITIO DE BARRAR: o dia da sala so' avanca quando
-- TODOS os assentos humanos confirmam. Um assento que nunca confirma segura a
-- sala inteira -- os outros ficam parados a' espera de quem nao pode jogar. A
-- trava tem de TIRAR a pessoa do assento, nao imobiliza-la nele. Por isso sao
-- dois movimentos:
--   · claim_seat recusa quem ja' venceu (nao entra em sala nova);
--   · liberar_assentos_vencidos() devolve a' CPU o assento de quem venceu
--     enquanto jogava, e a sala segue.
--
-- O TRABALHO PERIODICO E' PROPRIO, de 5 em 5 minutos:
--   select cron.schedule('elifoot-peladeiro-vencido', '*/5 * * * *',
--     $$select elifoot_v3.liberar_assentos_vencidos()$$);
-- NAO entra no elifoot-tick-rooms, que corre de 5 em 5 SEGUNDOS: isto nao
-- precisa dessa frequencia e encareceria o caminho quente do fecho de rodada.
-- ============================================================

-- plano_limites ganha pode_resenha + resenha_ate. Muda o tipo de retorno, entao
-- tem de cair antes (nenhuma vista depende dela; as outras funcoes que a chamam
-- nao criam dependencia rigida).
drop function if exists elifoot_v3.plano_limites(uuid);
create or replace function elifoot_v3.plano_limites(p_user uuid default auth.uid())
returns table (plan text, saves_max int, pode_hospedar boolean, sala_max int,
               avatar_ia boolean, pode_resenha boolean, resenha_ate timestamptz)
language sql stable security definer set search_path to '' as $$
  with atual as (
    select coalesce(
      (select case when up.until is not null and up.until <= now() then 'free' else up.plan end
         from elifoot_v3.user_plans up where up.user_id = p_user),
      'free') as p,
      (select u.created_at from auth.users u where u.id = p_user) as nasceu
  )
  select a.p,
         (case a.p when 'embaixador' then null when 'resenha' then 10 else 3 end)::int,
         (a.p = 'embaixador'),
         (case a.p when 'embaixador' then 8 else 0 end)::int,
         (a.p = 'embaixador'),
         (a.p <> 'free' or (a.nasceu is not null and now() < a.nasceu + interval '7 days')),
         (case when a.p <> 'free' then null else a.nasceu + interval '7 days' end)
  from atual a;
$$;

grant execute on function elifoot_v3.plano_limites(uuid) to authenticated;
grant execute on function elifoot_v3.plano_limites(uuid) to service_role;

drop function if exists elifoot_v3.my_plan();
create or replace function elifoot_v3.my_plan()
returns table (plan text, pro boolean, until timestamptz,
               saves_max int, pode_hospedar boolean, sala_max int, avatar_ia boolean,
               pode_resenha boolean, resenha_ate timestamptz)
language sql stable security definer set search_path to '' as $$
  select l.plan, (l.plan <> 'free'),
         (select up.until from elifoot_v3.user_plans up where up.user_id = auth.uid()),
         l.saves_max, l.pode_hospedar, l.sala_max, l.avatar_ia, l.pode_resenha, l.resenha_ate
  from elifoot_v3.plano_limites(auth.uid()) l;
$$;
grant execute on function elifoot_v3.my_plan() to authenticated;

-- claim_seat: o prazo entra ANTES do teto de humanos, e depois da aprovacao do
-- anfitriao — a mensagem que a pessoa recebe tem de ser a razao verdadeira.
create or replace function elifoot_v3.claim_seat(p_game text, p_club text)
returns void language plpgsql security definer set search_path to '' as $function$
declare v_max int; v_humanos int; v_pode boolean;
begin
  if not (
       exists(select 1 from elifoot_v3.games g where g.id=p_game and g.host_id=auth.uid())
    or exists(select 1 from elifoot_v3.room_invites ri where ri.game_id=p_game and ri.user_id=auth.uid())
    or exists(select 1 from elifoot_v3.join_requests jr where jr.game_id=p_game and jr.user_id=auth.uid() and jr.status='approved')
  ) then
    raise exception 'entrada não aprovada pelo anfitrião';
  end if;
  if exists(select 1 from elifoot_v3.game_seats where game_id=p_game and user_id=auth.uid()) then
    raise exception 'você já está numa vaga desta sala';
  end if;

  select l.pode_resenha into v_pode from elifoot_v3.plano_limites(auth.uid()) l;
  if not v_pode then
    raise exception 'PLANO_RESENHA: os seus 7 dias de Modo Resenha terminaram';
  end if;

  select l.sala_max into v_max
    from elifoot_v3.games g
    join lateral elifoot_v3.plano_limites(g.host_id) l on true
   where g.id = p_game;
  select count(*) into v_humanos from elifoot_v3.game_seats
   where game_id = p_game and user_id is not null;
  if coalesce(v_max,0) > 0 and v_humanos >= v_max then
    raise exception 'PLANO_SALA_CHEIA: esta sala ja tem % treinadores, que e o maximo', v_max;
  end if;

  update elifoot_v3.game_seats set user_id = auth.uid(), is_cpu = false
    where game_id = p_game and club_id = p_club and user_id is null;
  if not found then raise exception 'clube indisponível'; end if;
end; $function$;

-- O ASSENTO SO' SAI NO FIM DO DIA (ajuste de 01/09). A versao anterior tirava o
-- assento assim que o prazo passava, o que podia acontecer a meio de uma
-- escalacao, com a pessoa a olhar para o ecra. Agora sai por uma de duas portas:
--   · ja' cumpriu o dia (day_ack carimbado no dia e momento atuais) -- terminou
--     o que estava a fazer e a sala nao espera mais nada dele;
--   · nao da' sinal de vida ha' mais de 10 minutos -- sem isto, quem fecha o
--     separador antes de confirmar ficava no assento para sempre e a sala
--     parava a' espera de quem nao pode jogar.
-- day_ack = null junto com a libertacao: um carimbo antigo de quem ja' saiu
-- contaria como voto no dia seguinte.
create or replace function elifoot_v3.liberar_assentos_vencidos()
returns integer language plpgsql security definer set search_path to '' as $function$
declare n int;
begin
  with vencidos as (
    select s.game_id, s.club_id
      from elifoot_v3.game_seats s
      join elifoot_v3.games g on g.id = s.game_id
      join lateral elifoot_v3.plano_limites(s.user_id) l on true
     where s.user_id is not null
       and not l.pode_resenha
       and ( s.day_ack = (g.day_idx::text || ':' || g.day_moment)
             or s.last_seen is null
             or s.last_seen < now() - interval '10 minutes' )
  )
  update elifoot_v3.game_seats s
     set user_id = null, is_cpu = true, day_ack = null
    from vencidos v
   where s.game_id = v.game_id and s.club_id = v.club_id;
  get diagnostics n = row_count;
  return n;
end; $function$;
