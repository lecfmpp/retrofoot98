-- ============================================================
-- SPLASH DE CARREGAMENTO — 10 SEGUNDOS GARANTIDOS
-- Aplicado em 2026-08-31.
--
-- A tela de carregamento passou a durar 10 segundos cravados (RF_LOAD_MS em
-- public/src/ui/main.js). A barra era um sorteio e fechava em pouco mais de um
-- segundo e meio: o splash de tela cheia passava rapido demais para ser visto.
-- A espera nao esta a aguardar trabalho nenhum -- a montagem do save acontece
-- no fim, de uma vez. A espera E' o produto: e' o voo que este espaco vende.
--
-- Aqui so' muda a NOTA, que e' o que o painel mostra a quem vende. A duracao
-- mora no cliente; se ela mudar la', muda aqui tambem.
-- ============================================================

update elifoot_v3.ad_spaces
   set nota = 'Tela cheia, sozinha no ecrã, com 10 segundos garantidos de exposição em toda entrada de save novo — a tela de carregamento tem duração fixa. Arte parada; o jogo já desenha a barra de progresso por baixo dela.'
 where chave = 'rf98.loading.splash';
