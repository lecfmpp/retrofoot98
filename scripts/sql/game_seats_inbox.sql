-- ============================================================================
-- Coluna inbox no game_seats — persiste a CAIXA DE ENTRADA (e-mail) do treinador
-- por jogador, no Resenha (durável + cross-device). O cliente lê/escreve o PRÓPRIO
-- assento (mesmo canal de last_xi/budget). O modo solo usa localStorage (não passa por aqui).
--
-- COMO APLICAR: cole no Supabase → SQL Editor → Run (projeto Investbola /
-- alxwgqvjmetjbbqtjkhx). Idempotente (IF NOT EXISTS).
-- ============================================================================
alter table elifoot_v3.game_seats
  add column if not exists inbox jsonb;

-- garante que o usuário autenticado pode ler/gravar a própria coluna inbox
grant select (inbox), update (inbox) on elifoot_v3.game_seats to authenticated;
