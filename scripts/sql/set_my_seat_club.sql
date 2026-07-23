-- ============================================================================
-- RPC: set_my_seat_club — troca o clube do PRÓPRIO assento na Resenha.
-- Usada pela Fase 2 da mecânica de demissão/carreira:
--   • p_club = NULL  -> o treinador fica DESEMPREGADO (o clube antigo vira CPU);
--   • p_club = <id>  -> assume um clube LIVRE (sem outro humano nele).
--
-- Por que uma RPC: as políticas de RLS travam UPDATE direto em game_seats, e claim_seat
-- dá erro se você já tem assento (então não dá pra trocar de clube por conta própria).
-- SECURITY DEFINER + auth.uid() garantem que cada um só mexe no PRÓPRIO assento.
--
-- COMO APLICAR: cole tudo isto no Supabase → SQL Editor → Run (projeto Investbola /
-- alxwgqvjmetjbbqtjkhx). É idempotente (CREATE OR REPLACE). Depois teste com 2 contas.
-- ============================================================================
create or replace function elifoot_v3.set_my_seat_club(p_game uuid, p_club text)
returns void
language plpgsql
security definer
set search_path = elifoot_v3, public
as $$
begin
  -- o chamador precisa ter um assento nesta sala
  if not exists (
    select 1 from elifoot_v3.game_seats
    where game_id = p_game and user_id = auth.uid()
  ) then
    raise exception 'sem assento nesta sala';
  end if;

  -- ao ASSUMIR um clube (p_club não nulo), ele precisa estar LIVRE (nenhum OUTRO humano nele)
  if p_club is not null and exists (
    select 1 from elifoot_v3.game_seats
    where game_id = p_game and club_id = p_club
      and user_id is not null and user_id <> auth.uid()
  ) then
    raise exception 'clube já ocupado';
  end if;

  -- troca o clube do MEU assento; zera a rodada publicada pra não vazar dados do clube antigo.
  update elifoot_v3.game_seats
  set club_id           = p_club,
      is_ready          = false,
      last_xi           = null,
      last_tactic       = null,
      last_result       = null,
      last_result_round = null,
      last_cup_result   = null,
      last_cup_round    = null
  where game_id = p_game and user_id = auth.uid();
end;
$$;

grant execute on function elifoot_v3.set_my_seat_club(uuid, text) to authenticated;
