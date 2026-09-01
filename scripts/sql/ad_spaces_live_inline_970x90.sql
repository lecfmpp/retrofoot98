-- ============================================================
-- FAIXA DA RODADA AO VIVO — de 468×60 para 970×90
-- Aplicado em 2026-08-31.
--
-- O QUE MUDOU NA TELA: a faixa (rf98.live.inline) passa a PEGAR DE PONTA A
-- PONTA, na mesma largura da barra com o nome da competicao que fica logo
-- acima dela. Era um bloco de 468 centrado no meio de uma coluna de 1180 --
-- sobrava um terco de vazio de cada lado e a peca nao alinhava com nada.
--
-- POR QUE A MEDIDA MUDA: o lugar e' desenhado na largura da coluna, com a
-- proporcao do criativo (ver .rf-ad-inline em public/src/styles/main.css). Com
-- 468×60 vendido, arte na medida certa entrava a 850 de largura numa faixa de
-- 1180: continuava a sobrar vazio. 970×90 e' o mesmo leaderboard do topo do
-- jogo -- proporcao 10.8:1, que preenche a coluna inteira.
--
-- ATENCAO AO CRIATIVO QUE JA' ESTA NO AR: o que esta publicado nesta chave e'
-- de 468×60. Ele nao quebra -- entra centrado, com margem dos dois lados --
-- mas so' pega de ponta a ponta quando for reexportado a 970×90.
-- ============================================================

update elifoot_v3.ad_spaces
   set iab  = 'IAB Super Leaderboard 970×90 / Mobile Banner 320×50',
       w    = 970,
       h    = 90,
       mw   = 320,
       mh   = 50,
       peso_kb = 120,
       nota = 'Ocupa a largura inteira da coluna, encostada na barra do nome da competição. A arte é desenhada na proporção que tiver: fora de 970×90 ela entra centrada, com margem dos dois lados, em vez de esticar.'
 where chave = 'rf98.live.inline';
