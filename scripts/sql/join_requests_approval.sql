-- ============================================================
-- RESENHA: aprovação de entrada (pendente -> aprovado)
-- Rodar no SQL Editor do Supabase (projeto alxwgqvjmetjbbqtjkhx).
-- Idempotente: pode rodar mais de uma vez sem erro.
-- ============================================================

-- 1) Tabela de pedidos de entrada -----------------------------------------
create table if not exists elifoot_v3.join_requests (
  game_id    text        not null references elifoot_v3.games(id) on delete cascade,
  user_id    uuid        not null,
  name       text,
  status     text        not null default 'pending',   -- 'pending' | 'approved' | 'rejected'
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (game_id, user_id)
);
alter table elifoot_v3.join_requests enable row level security;

-- 2) RLS ------------------------------------------------------------------
-- requester cria o PRÓPRIO pedido, sempre 'pending'
drop policy if exists jr_insert_self on elifoot_v3.join_requests;
create policy jr_insert_self on elifoot_v3.join_requests for insert
  with check (user_id = auth.uid() and status = 'pending');

-- requester lê o próprio pedido; host lê todos os pedidos da sala dele
drop policy if exists jr_select on elifoot_v3.join_requests;
create policy jr_select on elifoot_v3.join_requests for select
  using (user_id = auth.uid()
         or exists(select 1 from elifoot_v3.games g
                   where g.id = join_requests.game_id and g.host_id = auth.uid()));

-- só o host aprova/recusa (UPDATE do status)
drop policy if exists jr_update_host on elifoot_v3.join_requests;
create policy jr_update_host on elifoot_v3.join_requests for update
  using (exists(select 1 from elifoot_v3.games g
               where g.id = join_requests.game_id and g.host_id = auth.uid()))
  with check (exists(select 1 from elifoot_v3.games g
               where g.id = join_requests.game_id and g.host_id = auth.uid()));

-- requester cancela o próprio pedido; host também pode limpar
drop policy if exists jr_delete on elifoot_v3.join_requests;
create policy jr_delete on elifoot_v3.join_requests for delete
  using (user_id = auth.uid()
         or exists(select 1 from elifoot_v3.games g
                   where g.id = join_requests.game_id and g.host_id = auth.uid()));

-- 3) Grants ---------------------------------------------------------------
grant select, insert, update, delete on elifoot_v3.join_requests to authenticated;

-- 4) Reforço no servidor: só reivindica assento quem é HOST, foi convidado
--    internamente (room_invites) ou tem pedido APROVADO. Impede "logar
--    automático" mesmo que alguém contorne a UI.
create or replace function elifoot_v3.claim_seat(p_game text, p_club text)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if not (
       exists(select 1 from elifoot_v3.games g
              where g.id = p_game and g.host_id = auth.uid())
    or exists(select 1 from elifoot_v3.room_invites ri
              where ri.game_id = p_game and ri.user_id = auth.uid())
    or exists(select 1 from elifoot_v3.join_requests jr
              where jr.game_id = p_game and jr.user_id = auth.uid() and jr.status = 'approved')
  ) then
    raise exception 'entrada não aprovada pelo anfitrião';
  end if;
  if exists(select 1 from elifoot_v3.game_seats where game_id = p_game and user_id = auth.uid()) then
    raise exception 'você já está numa vaga desta sala';
  end if;
  update elifoot_v3.game_seats set user_id = auth.uid(), is_cpu = false
    where game_id = p_game and club_id = p_club and user_id is null;
  if not found then raise exception 'clube indisponível'; end if;
end; $function$;
