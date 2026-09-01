-- ============================================================
-- BOTAO POR PATROCINADOR NA BANDA DO CAMAROTE
-- Aplicado em 2026-08-31.
--
-- A banda tem cinco logos e UM botao, a' direita. O botao acompanha o logo em
-- destaque (o destaque gira a cada 8 minutos de jogo) e agora e' do anunciante:
-- texto, cor de fundo e cor do texto viajam com o CRIATIVO, nao com o codigo.
-- Antes eles vinham de AD_SPONSORS, a lista de marcas de casa dentro do jogo.
--
-- A URL do botao e' o `link_destino` que o painel ja' pedia: o logo e o botao
-- levam ao mesmo sitio, que e' o que o anunciante compra. Sem texto de botao,
-- o lugar mostra so' o logo -- e' assim que um patrocinador que nao quer botao
-- fica sem botao, sem precisar de outra chave.
--
-- `ad_spaces.tem_botao` diz ao PAINEL onde pedir esses campos. Sem ela, os tres
-- campos apareceriam em todos os espacos do inventario, incluindo os que nao
-- desenham botao nenhum.
--
-- O 5o LUGAR DA BANDA GANHOU CHAVE PROPRIA (rf98.camarote.logo1). O 1o lugar
-- era o proprio patrocinio de apresentacao (rf98.pausa.barra), que tambem serve
-- a pausa da Resenha e a rodada de copa: com botao proprio por lugar, ele
-- precisava de ser um lugar como os outros. rf98.pausa.barra continua a existir
-- e continua a aparecer no 1o lugar ENQUANTO logo1 estiver vazio -- ver
-- RF_CAM_LOGOS em public/src/ui/rf26-live.js.
-- ============================================================

alter table elifoot_v3.ad_creatives
  add column if not exists cta_texto text,
  add column if not exists cta_bg    text,
  add column if not exists cta_fg    text;

alter table elifoot_v3.ad_spaces
  add column if not exists tem_botao boolean not null default false;

comment on column elifoot_v3.ad_creatives.cta_texto is 'Texto do botão do patrocinador (banda do Camarote). Vazio = sem botão.';
comment on column elifoot_v3.ad_creatives.cta_bg is 'Cor de fundo do botão, #rrggbb.';
comment on column elifoot_v3.ad_creatives.cta_fg is 'Cor do texto do botão, #rrggbb.';
comment on column elifoot_v3.ad_spaces.tem_botao is 'O espaço desenha um botão de chamada ao lado do criativo — o painel só pede texto/cores nos espaços marcados aqui.';

insert into elifoot_v3.ad_spaces (chave, nome, iab, local, tipo, w, h, mw, mh, formatos, peso_kb, ord, dur_max_s, sem_audio, tem_botao, nota) values
 ('rf98.camarote.logo1','Camarote — logo 1','Logo 240×80, fundo transparente',
  'Camarote — banda de patrocinadores no pé da tela','modal',240,80,240,80,
  array['PNG','WEBP'],40,14,null,true,true,
  'Logo sobre fundo claro, com margem interna — ele aparece dentro de uma pastilha branca de 30px de altura. Os cinco lugares da banda giram no destaque, um a cada 8 minutos de jogo, e o botão à direita é o do lugar em destaque. Enquanto este lugar estiver vazio, ele mostra o criativo do patrocínio de apresentação (rf98.pausa.barra).')
on conflict (chave) do nothing;

update elifoot_v3.ad_spaces set tem_botao = true where chave like 'rf98.camarote.logo%';

update elifoot_v3.ad_spaces
   set nome = 'Patrocínio de apresentação',
       ord  = 19,
       nota = 'Logo sobre fundo claro, com margem interna — ele aparece dentro de uma pastilha branca. Uma compra cobre as faixas de "apresentado por" do jogo: a pausa entre jornadas da Resenha e a rodada de copa que o clube não disputa. No Camarote ele entra no 1º lugar da banda enquanto rf98.camarote.logo1 estiver vazio.'
 where chave = 'rf98.pausa.barra';
