-- ============================================================
-- ESPACOS DE PUBLICIDADE APOSENTADOS — RetroFoot98
-- Aplicado em 2026-08-30.
--
-- POR QUE SAIRAM: o painel listava-os como "livres para vender" e o jogo nao
-- tinha onde os desenhar. Vender um lugar que nao existe e' pior do que nao o
-- ter no catalogo -- o anunciante paga e nao aparece, e quem vende so' descobre
-- quando ele reclama.
--
--   rf98.anchor.bottom · a faixa fixa do rodape, aposentada em 18/08/2026 por
--     comer a base do ecra em todas as paginas. rfAncoraHTML (ui/rf26.js) ficou
--     de proposito como funcao vazia: se a barra voltar, volta por la'.
--   rf98.pausa.video · o bloco do video da pausa da Resenha foi removido do
--     desenho (ver o comentario em ui/rf26-resenha.js).
--
-- Nenhum dos dois tinha criativo — nada foi perdido, e ninguem deixou de ser
-- entregue. Para os trazer de volta, e' correr o INSERT abaixo E devolver o
-- desenho no cliente: so' a linha na tabela poe o lugar a' venda outra vez sem
-- ter onde aparecer, que e' exatamente o problema que isto resolve.
-- ============================================================

/*
insert into elifoot_v3.ad_spaces (chave, nome, iab, local, tipo, w, h, mw, mh, formatos, peso_kb, ord, dur_max_s, sem_audio, nota) values
 ('rf98.anchor.bottom','Billboard âncora','IAB Leaderboard 970×90 / Mobile Banner 320×50',
  'Todas as páginas — faixa fixa no rodapé','pagina',970,90,320,50,
  array['JPG','PNG','WEBP'],150,1,null,true,null),
 ('rf98.pausa.video','Vídeo da pausa patrocinada','Full-screen 16:9 — 1280×720',
  'Modo Resenha — pausa entre jornadas, enquanto a rodada fecha','modal',1280,720,1280,720,
  array['MP4','WEBM','JPG','WEBP'],1200,11,8,true,
  'Toca sozinho, em laço e sem som. Os 3 primeiros segundos não podem ser pulados. Imagem parada também vale.');
*/

delete from elifoot_v3.ad_spaces where chave in ('rf98.anchor.bottom','rf98.pausa.video');

-- o billboard das boas-vindas herdou a vaga 1 que o ancora deixou: sao os dois
-- billboards de pagina, e assim nenhum `ord` fica repetido (empate deixa a
-- ordem do painel instavel entre carregamentos)
update elifoot_v3.ad_spaces set ord = 1 where chave = 'rf98.entrada.sorteio';
