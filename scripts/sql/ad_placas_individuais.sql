-- ============================================================
-- PLACAS DO CAMPO — UMA ARTE E UM LINK POR PLACA
-- Aplicado em 2026-09-01.
--
-- O campo tem 12 placas: 3 acima, 3 abaixo e 3 de cada lado. Havia DUAS chaves
-- (deitada e em pe') e UMA arte cada: quem comprava as deitadas via a sua marca
-- repetida nas seis, e nao havia como vender a placa do meio a outra marca.
--
-- Agora cada feitio tem TRES placas independentes. O trio de deitadas aparece em
-- cima e em baixo, e o de em pe' de cada lado -- o mesmo anel de placas a dar a
-- volta ao campo, como num estadio de verdade. Placa por vender cai no rotulo de
-- casa: as vendidas e as livres convivem no mesmo anel.
--
-- `ad_creatives.posicao` diz QUAL placa o criativo ocupa. Nulo em todos os
-- outros espacos -- eles continuam a ter um criativo so', e nada neles muda.
-- `ad_spaces.placas` diz ao painel quantos blocos desenhar no modal; 0 (o
-- padrao) e' o espaco normal de sempre.
--
-- OS EVENTOS CONTINUAM A IR NA CHAVE DO ESPACO, sem a posicao: e' por chave que
-- o painel soma impressoes e cliques, e partir a soma em tres linhas novas
-- mudaria o historico do espaco a meio. O id do criativo vai no mesmo evento,
-- entao o numero de UMA placa continua a ser recuperavel.
--
-- admin_rf98.publicidade() foi recriada na mesma leva: passa a devolver
-- `criativos`, a lista de placas no ar de cada espaco (vazia onde nao ha placas).
-- ============================================================

alter table elifoot_v3.ad_creatives add column if not exists posicao smallint;
alter table elifoot_v3.ad_spaces   add column if not exists placas  smallint not null default 0;

comment on column elifoot_v3.ad_creatives.posicao is 'Qual placa do espaço este criativo ocupa (1..ad_spaces.placas). Nulo = o espaço inteiro, que é como funcionam todos os outros.';
comment on column elifoot_v3.ad_spaces.placas is 'Quantas placas independentes o espaço tem. 0 = espaço normal, um criativo só.';

update elifoot_v3.ad_spaces set placas = 3 where chave in ('rf98.campo.deitada','rf98.campo.empe');

update elifoot_v3.ad_spaces
   set nome = 'Placas do campo — deitadas (3)',
       nota = 'TRÊS placas independentes, cada uma com arte e link próprios. O trio aparece acima E abaixo do campo, como o mesmo anel de placas dá a volta a um estádio de verdade. Texto curto e legível em 22px de altura — logo e uma palavra funcionam; frase longa não.'
 where chave = 'rf98.campo.deitada';
update elifoot_v3.ad_spaces
   set nome = 'Placas do campo — em pé (3)',
       nota = 'TRÊS placas independentes, cada uma com arte e link próprios. O trio aparece de cada lado do campo. O texto é lido de baixo para cima — se enviar arte com texto, escreva-o já rodado.'
 where chave = 'rf98.campo.empe';
