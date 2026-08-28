-- ============================================================
-- OS TRES PLANOS (peladeiro / resenha / embaixador) — RetroFoot98
-- Aplicado em 2026-08-28 (migracao elifoot_v3_user_plans_tiers, ja no banco).
-- Copia versionada, para o schema nao viver so' no Supabase.
-- Continuacao de user_plans_pro.sql.
--
-- POR QUE TRES E NAO DOIS: a landing (RF_PLANOS, ui/rf26-landing.js) vende
-- Peladeiro (R$ 0), Resenha (R$ 19,90) e Embaixador (R$ 49,90), e o que separa
-- os dois planos pagos NAO e' um sim/nao — e' quantos saves guarda e quem pode
-- abrir sala. Com free/pro o tier do meio nao tinha como existir, e a pagina
-- prometia uma coisa que o jogo nao sabia distinguir.
--
-- OS NUMEROS VIVEM AQUI, NUM SITIO SO'. plano_limites() devolve os limites e
-- my_plan() leva-os ao cliente — o navegador nunca escreve "3" ou "10" a mao.
-- E' a mesma regra que a landing ja segue com o preco: limite em dois sitios e'
-- limite errado num deles mais cedo ou mais tarde.
--
-- COMO CONCEDER (SQL editor ou webhook com service_role):
--   insert into elifoot_v3.user_plans (user_id, plan, source, until)
--   values ('<uuid>', 'embaixador', 'stripe', now() + interval '1 year')
--   on conflict (user_id) do update
--     set plan=excluded.plan, source=excluded.source,
--         until=excluded.until, updated_at=now();
--
-- COMO TIRAR: update ... set plan='free' (ou `until` no passado, que caduca
-- sozinho — plano_limites() ja respeita o prazo).
-- ============================================================

-- ---- 1. os planos antigos viram o tier de cima ----------------------------
-- 'pro' era o unico plano pago que existia e dava tudo; o equivalente hoje e'
-- o Embaixador. Migrar ANTES de trocar o check, senao a propria linha
-- existente viola a restricao nova.
alter table elifoot_v3.user_plans drop constraint if exists user_plans_plan_check;
update elifoot_v3.user_plans set plan='embaixador', updated_at=now() where plan='pro';
alter table elifoot_v3.user_plans
  add constraint user_plans_plan_check check (plan in ('free','resenha','embaixador'));

-- ---- 2. OS LIMITES DE CADA PLANO -----------------------------------------
-- saves_max NULL = sem teto. sala_max = quantos HUMANOS cabem numa sala aberta
-- por esta conta (a sala tem 20 assentos de clube; o plano limita as pessoas).
create or replace function elifoot_v3.plano_limites(p_user uuid default auth.uid())
returns table (plan text, saves_max int, pode_hospedar boolean, sala_max int, avatar_ia boolean)
language sql stable security definer set search_path to '' as $$
  with atual as (
    select coalesce(
      (select case when up.until is not null and up.until <= now() then 'free' else up.plan end
         from elifoot_v3.user_plans up where up.user_id = p_user),
      'free') as p
  )
  select a.p,
         (case a.p when 'embaixador' then null when 'resenha' then 10 else 3 end)::int,
         (a.p = 'embaixador'),
         (case a.p when 'embaixador' then 8 else 0 end)::int,
         (a.p = 'embaixador')
  from atual a;
$$;

-- is_pro() continua a querer dizer "qualquer plano pago", que e' como a edge
-- function do avatar e o cabecalho ja o leem.
create or replace function elifoot_v3.is_pro(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path to '' as $$
  select (select l.plan from elifoot_v3.plano_limites(p_user) l) <> 'free';
$$;

-- my_plan() ganha os limites. Muda o tipo de retorno, entao tem de cair antes.
drop function if exists elifoot_v3.my_plan();
create or replace function elifoot_v3.my_plan()
returns table (plan text, pro boolean, until timestamptz,
               saves_max int, pode_hospedar boolean, sala_max int, avatar_ia boolean)
language sql stable security definer set search_path to '' as $$
  select l.plan, (l.plan <> 'free'),
         (select up.until from elifoot_v3.user_plans up where up.user_id = auth.uid()),
         l.saves_max, l.pode_hospedar, l.sala_max, l.avatar_ia
  from elifoot_v3.plano_limites(auth.uid()) l;
$$;

grant execute on function elifoot_v3.plano_limites(uuid) to authenticated;
-- a edge function coach-avatar pergunta os limites por aqui, com a service_role
grant execute on function elifoot_v3.plano_limites(uuid) to service_role;
grant execute on function elifoot_v3.my_plan() to authenticated;
grant execute on function elifoot_v3.is_pro(uuid) to authenticated;

-- ---- 3. TRAVA: teto de saves do modo solo --------------------------------
-- ARMADILHA QUE ESTE TRIGGER TEM DE DESVIAR: o cliente grava com
--   upsert(... , {onConflict:'user_id,save_name'})  (netSaveSoloGame)
-- e no Postgres o BEFORE INSERT dispara ANTES de o conflito ser resolvido.
-- Sem o desvio abaixo, quem estivesse no teto deixaria de conseguir GRAVAR os
-- saves que ja tem — o jogo travaria a cada autosave, que e' o oposto do que
-- se quer. So' conta como save novo o nome que ainda nao existe na conta.
create or replace function elifoot_v3.solo_saves_teto()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_teto int; v_usados int;
begin
  if exists (select 1 from elifoot_v3.solo_saves s
              where s.user_id = new.user_id and s.save_name = new.save_name) then
    return new;                                   -- gravacao de save existente
  end if;
  select l.saves_max into v_teto from elifoot_v3.plano_limites(new.user_id) l;
  if v_teto is null then return new; end if;      -- Embaixador: sem teto
  select count(*) into v_usados from elifoot_v3.solo_saves s where s.user_id = new.user_id;
  if v_usados >= v_teto then
    raise exception 'PLANO_SAVES: o seu plano guarda ate % jogos salvos', v_teto;
  end if;
  return new;
end; $$;

drop trigger if exists solo_saves_teto on elifoot_v3.solo_saves;
create trigger solo_saves_teto before insert on elifoot_v3.solo_saves
  for each row execute function elifoot_v3.solo_saves_teto();

-- ---- 4. TRAVA: abrir sala e' do Embaixador --------------------------------
-- create_game e' o UNICO caminho de criacao de sala (netCreateRoom), e e'
-- SECURITY DEFINER: a checagem aqui vale mesmo com o cliente adulterado.
create or replace function elifoot_v3.create_game(p_name text, p_club_ids text[], p_mode text default 'sorteio')
returns text language plpgsql security definer set search_path to '' as $function$
declare g text; c text;
begin
  if not (select l.pode_hospedar from elifoot_v3.plano_limites(auth.uid()) l) then
    raise exception 'PLANO_HOSPEDAR: abrir sala e do plano Embaixador';
  end if;
  g := elifoot_v3.generate_room_code();
  insert into elifoot_v3.games(id, name, host_id, mode, seed)
    values (g, p_name, auth.uid(), coalesce(p_mode,'sorteio'), floor(random()*9000000000000000000)::bigint);
  foreach c in array p_club_ids loop
    insert into elifoot_v3.game_seats(game_id, club_id, is_cpu) values (g, c, true);
  end loop;
  return g;
end; $function$;

-- ---- 5. TRAVA: quantos humanos cabem na sala ------------------------------
-- O teto e' o do ANFITRIAO (quem paga a sala), nao o de quem entra: o
-- Peladeiro joga na sala dos outros, e' o que a landing promete.
create or replace function elifoot_v3.claim_seat(p_game text, p_club text)
returns void language plpgsql security definer set search_path to '' as $function$
declare v_max int; v_humanos int;
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
  select l.sala_max into v_max
    from elifoot_v3.games g
    join lateral elifoot_v3.plano_limites(g.host_id) l on true
   where g.id = p_game;
  select count(*) into v_humanos from elifoot_v3.game_seats
   where game_id = p_game and user_id is not null;
  -- ANFITRIAO REBAIXADO NAO ESVAZIA A SALA. Se o plano dele caducou, sala_max
  -- vem 0 e o teto simplesmente nao se aplica: a sala que ja existe continua a
  -- receber gente. Trancar aqui puniria os convidados, que nao decidiram nada —
  -- e' o mesmo principio dos saves, que congelam sem se perder. Quem nao paga
  -- deixa de abrir salas NOVAS (create_game), que e' onde a cobranca faz sentido.
  if coalesce(v_max,0) > 0 and v_humanos >= v_max then
    raise exception 'PLANO_SALA_CHEIA: esta sala ja tem % treinadores, que e o maximo', v_max;
  end if;
  update elifoot_v3.game_seats set user_id = auth.uid(), is_cpu = false
    where game_id = p_game and club_id = p_club and user_id is null;
  if not found then raise exception 'clube indisponível'; end if;
end; $function$;

-- ---- 6. CORTESIA DE BETA --------------------------------------------------
-- Quem ja estava a testar antes desta migracao nao pode acordar trancado: sem
-- checkout ligado, ninguem tem como assinar para se destravar. Todas as contas
-- existentes ficam Embaixador por cortesia; contas NOVAS nascem Peladeiro.
-- Para testar o plano gratis: update ... set plan='free' na sua propria linha.
insert into elifoot_v3.user_plans (user_id, plan, source, note)
select u.id, 'embaixador', 'beta', 'cortesia de beta (migracao dos tres planos)'
  from auth.users u
 on conflict (user_id) do nothing;
