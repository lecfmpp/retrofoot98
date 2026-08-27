-- ==================================================================
-- FECHAR AS 7 TABELAS DE APOIO (backups + migracao de renome).
--
-- O QUE ESTAVA ABERTO: as sete nasceram de `create table as select`, que
-- NAO liga RLS e herda os grants amplos do schema. Resultado: a chave
-- publicavel do jogo — que esta' no bundle, visivel para qualquer um —
-- tinha SELECT, INSERT, UPDATE e DELETE nas sete. Duas delas guardam
-- saves reais (bkp_solo_hist 51 linhas, bkp_resenha_hist 18) e a fila de
-- renome guarda user_id + nome do save. Dava para ler tudo isso e, pior,
-- para APAGAR.
--
-- POR QUE SEM POLICY NENHUMA: nenhuma linha de cliente le' estas tabelas
-- (nem o jogo, nem o painel — conferido por busca no repo). Quem trabalha
-- nelas e' SQL direto/service role, que passa por cima de grants e de RLS.
-- Entao a porta certa e' a porta fechada: RLS ligada sem policy nao e' um
-- descuido aqui, e' a configuracao.
--
-- DUAS CAMADAS de proposito: o REVOKE e' a fechadura, a RLS e' o trinco.
-- So' a RLS deixaria os grants la', esperando que alguem crie uma policy
-- permissiva no futuro e reabra tudo sem perceber.
-- ==================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'mapa_renome_2026', 'rf_fila_renome',
    'bkp_solo_saves_20260826', 'bkp_resenha_saves_20260826', 'bkp_games_20260826',
    'bkp_solo_hist_20260826b', 'bkp_resenha_hist_20260826b'
  ] loop
    execute format('revoke all on elifoot_v3.%I from anon, authenticated', t);
    execute format('alter table elifoot_v3.%I enable row level security', t);
  end loop;
end $$;

-- A VIEW E' A PORTA DOS FUNDOS. rf_mapas fica sobre mapa_renome_2026, e'
-- de `postgres` e tem security_invoker OFF — ou seja, roda com os poderes
-- do dono e IGNORA a RLS da tabela de baixo. Fechar so' a tabela deixaria
-- a view servindo o conteudo do mesmo jeito. Nada no repo a usa.
revoke all on elifoot_v3.rf_mapas from anon, authenticated;
