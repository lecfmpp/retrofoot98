-- ============================================================
-- BANDA DE PATROCINADORES DO CAMAROTE — os quatro lugares que faltavam
-- Aplicado em 2026-08-31.
--
-- O QUE MUDOU NA TELA: a banda do pe' do Camarote voltou a ter CINCO lugares
-- (ver RF_CAM_LOGOS em public/src/ui/rf26-live.js). Ela desenhava um so' — o
-- patrocinio de apresentacao (rf98.pausa.barra) — e, sem ele publicado, caia
-- nos logos de casa de AD_SPONSORS, que nao estao a' venda.
--
-- O 1o LUGAR CONTINUA A SER rf98.pausa.barra, que ja' estava no catalogo e
-- cobre as tres faixas de "apresentado por" do jogo (Camarote, pausa da Resenha
-- e rodada de copa). E' ele quem leva o botao "Conhecer o patrocinador" — por
-- isso a numeracao aqui comeca no 2: sao os lugares 2 a 5 da mesma banda.
--
-- A MEDIDA E' A DO PRIMEIRO LUGAR, de proposito: os cinco sao pastilhas iguais
-- na mesma linha, e arte de proporcao diferente entraria menor que as vizinhas.
--
-- SO' A LINHA NA TABELA NAO PoE NADA NO AR: quem desenha e' o cliente. As duas
-- pontas ja' foram nesta mesma leva — se um dia a banda mudar de tamanho, e'
-- este ficheiro E rfCamPatroHTML que tem de mudar juntos.
-- ============================================================

insert into elifoot_v3.ad_spaces (chave, nome, iab, local, tipo, w, h, mw, mh, formatos, peso_kb, ord, dur_max_s, sem_audio, nota) values
 ('rf98.camarote.logo2','Camarote — logo 2','Logo 240×80, fundo transparente',
  'Camarote — banda de patrocinadores no pé da tela','modal',240,80,240,80,
  array['PNG','WEBP'],40,15,null,true,
  'Logo sobre fundo claro, com margem interna — ele aparece dentro de uma pastilha branca de 30px de altura. Os cinco lugares da banda giram no destaque, um a cada 8 minutos de jogo.'),
 ('rf98.camarote.logo3','Camarote — logo 3','Logo 240×80, fundo transparente',
  'Camarote — banda de patrocinadores no pé da tela','modal',240,80,240,80,
  array['PNG','WEBP'],40,16,null,true,
  'Logo sobre fundo claro, com margem interna — ele aparece dentro de uma pastilha branca de 30px de altura. Os cinco lugares da banda giram no destaque, um a cada 8 minutos de jogo.'),
 ('rf98.camarote.logo4','Camarote — logo 4','Logo 240×80, fundo transparente',
  'Camarote — banda de patrocinadores no pé da tela','modal',240,80,240,80,
  array['PNG','WEBP'],40,17,null,true,
  'Logo sobre fundo claro, com margem interna — ele aparece dentro de uma pastilha branca de 30px de altura. Os cinco lugares da banda giram no destaque, um a cada 8 minutos de jogo.'),
 ('rf98.camarote.logo5','Camarote — logo 5','Logo 240×80, fundo transparente',
  'Camarote — banda de patrocinadores no pé da tela','modal',240,80,240,80,
  array['PNG','WEBP'],40,18,null,true,
  'Logo sobre fundo claro, com margem interna — ele aparece dentro de uma pastilha branca de 30px de altura. Os cinco lugares da banda giram no destaque, um a cada 8 minutos de jogo.');

-- o patrocinio de apresentacao passa a dizer que e' o 1o dos cinco, e fica ao lado
-- deles na lista do painel (ord 14, logo antes do 15)
update elifoot_v3.ad_spaces
   set nome = 'Camarote — logo 1 (apresentação)',
       ord  = 14,
       nota = 'Logo sobre fundo claro, com margem interna — ele aparece dentro de uma pastilha branca. É o PRIMEIRO dos cinco lugares da banda do Camarote, e a mesma compra cobre as três faixas de "apresentado por" do jogo (Camarote, pausa da Resenha e rodada de copa). Com link, ganha o botão "Conhecer o patrocinador".'
 where chave = 'rf98.pausa.barra';
