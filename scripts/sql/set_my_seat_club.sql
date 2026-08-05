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
-- ---------------------------------------------------------------------------
-- CORREÇÃO (assumir clube dava "duplicate key ... game_seats_game_id_club_id_key")
-- ---------------------------------------------------------------------------
-- A versão anterior fazia um UPDATE simples do MEU assento pondo club_id = p_club, e a
-- única guarda era "nenhum OUTRO HUMANO neste clube". Só que game_seats tem uma linha por
-- CLUBE DA SALA, não por humano: todo clube que não tem dono existe ali como assento de CPU
-- (user_id null, is_cpu true) — hoje são ~2.5k dessas linhas em produção. A restrição
-- UNIQUE (game_id, club_id) então estourava sempre que o clube de destino já tinha linha,
-- que é o caso de QUALQUER clube da divisão em que a sala está rodando.
--
-- Efeito prático: aceitar convite pra treinar outro clube falhava com o erro de chave
-- duplicada em vez de trocar de time — e a sondagem vem justamente da mesma divisão na
-- maioria das vezes (ver resenhaOfferClubs no core.js).
--
-- Agora a troca é uma PERMUTA entre a minha linha e a linha do clube de destino, em três
-- passos, porque a UNIQUE não é deferrable e uma troca direta colidiria no meio do caminho:
--   1. solto a chave do destino (club_id = null nele);
--   2. assumo o clube de destino na MINHA linha;
--   3. devolvo o meu clube antigo pra linha que ficou livre, agora como CPU.
-- Se eu estava sem clube (desempregado), não há o que devolver no passo 3 e a linha de CPU
-- que sobrou é apagada. Se não existe linha pro clube de destino (clube de outra divisão),
-- o caminho é o UPDATE simples de sempre.
--
-- COMO APLICAR: cole tudo isto no Supabase → SQL Editor → Run (projeto Investbola /
-- alxwgqvjmetjbbqtjkhx). É idempotente (CREATE OR REPLACE). Depois teste com 2 contas.
-- ============================================================================
create or replace function elifoot_v3.set_my_seat_club(p_game text, p_club text)
returns void
language plpgsql
security definer
set search_path = elifoot_v3, public
as $$
declare
  v_uid       uuid := auth.uid();
  v_my_id     uuid;
  v_my_club   text;
  v_target_id uuid;
begin
  -- o chamador precisa ter um assento nesta sala
  select id, club_id into v_my_id, v_my_club
  from elifoot_v3.game_seats
  where game_id = p_game and user_id = v_uid
  limit 1;

  if v_my_id is null then
    raise exception 'sem assento nesta sala';
  end if;

  -- já estou nesse clube: nada a fazer (idempotente — o cliente reenvia em caso de retry)
  if p_club is not distinct from v_my_club then
    return;
  end if;

  -- ao ASSUMIR um clube (p_club não nulo), ele precisa estar LIVRE (nenhum OUTRO humano nele)
  if p_club is not null and exists (
    select 1 from elifoot_v3.game_seats
    where game_id = p_game and club_id = p_club
      and user_id is not null and user_id <> v_uid
  ) then
    raise exception 'clube já ocupado';
  end if;

  -- linha do clube de DESTINO (assento de CPU). Pode não existir, se o clube for de outra
  -- divisão — a sala só cria linha pros clubes da divisão em que ela começou.
  if p_club is not null then
    select id into v_target_id
    from elifoot_v3.game_seats
    where game_id = p_game and club_id = p_club
    limit 1;

    if v_target_id is not null then
      -- 1) solta a chave (game_id, club_id) do destino pra minha linha poder assumi-la
      update elifoot_v3.game_seats set club_id = null where id = v_target_id;
    end if;
  end if;

  -- 2) o MEU assento passa a ser o clube novo; zera a rodada publicada pra não vazar dados
  --    do clube antigo (escalação, tática e resultados são do time que ficou pra trás).
  update elifoot_v3.game_seats
  set club_id           = p_club,
      is_ready          = false,
      last_xi           = null,
      last_tactic       = null,
      last_result       = null,
      last_result_round = null,
      last_cup_result   = null,
      last_cup_round    = null
  where id = v_my_id;

  -- 3) a linha que ficou livre herda o meu clube ANTIGO, de volta como CPU. Sem clube antigo
  --    (eu estava desempregado) não há o que herdar e a linha órfã é removida.
  if v_target_id is not null then
    if v_my_club is not null then
      update elifoot_v3.game_seats
      set club_id           = v_my_club,
          user_id           = null,
          is_cpu            = true,
          is_ready          = false,
          name              = null,
          email             = null,
          last_xi           = null,
          last_tactic       = null,
          last_result       = null,
          last_result_round = null,
          last_cup_result   = null,
          last_cup_round    = null,
          busy_until        = null
      where id = v_target_id;
    else
      delete from elifoot_v3.game_seats where id = v_target_id;
    end if;
  end if;
end;
$$;

grant execute on function elifoot_v3.set_my_seat_club(text, text) to authenticated;
