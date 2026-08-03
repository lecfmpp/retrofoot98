-- ============================================================================
-- Coluna stadium no game_seats — persiste a capacidade do ESTÁDIO DO PRÓPRIO
-- clube (humano) no Resenha, no formato {capacity, builtThisSeason}. Sem isso,
-- uma bancada construída via clBuildStand() só existia na memória do navegador:
-- o custo saía do caixa (persistido via budget) mas o estádio maior sumia na
-- rodada seguinte, porque o cliente substitui S inteiro pelo estado do servidor.
-- Mesmo padrão exato da coluna budget/inbox: o cliente lê/escreve o PRÓPRIO
-- assento, e o servidor (resolve-round) reconcilia lendo essa coluna antes de
-- publicar a rodada, igual já faz com budget.
--
-- Aplicado via MCP do Supabase (apply_migration, projeto Investbola /
-- alxwgqvjmetjbbqtjkhx). Idempotente (IF NOT EXISTS).
-- ============================================================================
alter table elifoot_v3.game_seats
  add column if not exists stadium jsonb;

-- garante que o usuário autenticado pode ler/gravar a própria coluna stadium
grant select (stadium), update (stadium) on elifoot_v3.game_seats to authenticated;
