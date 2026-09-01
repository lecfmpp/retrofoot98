-- ============================================================
-- ARTE DE CELULAR NO MESMO CRIATIVO
-- Aplicado em 2026-08-31.
--
-- O PAINEL COBRAVA UMA MEDIDA QUE NAO TINHA COMO ENTREGAR. Cada espaco vende
-- duas medidas -- por exemplo 970×90 no desktop e 320×100 no telemovel -- e as
-- duas apareciam na ficha do espaco, mas a zona de envio era UMA: so' a arte de
-- desktop podia ser publicada. No telemovel ela entrava inteira, so' que menor.
--
-- Agora o criativo guarda as duas artes. Quem escolhe entre elas e' o browser,
-- por <picture>/<source media> no ponto de corte de 760px -- o mesmo do CSS (ver
-- html() em public/src/net/ads.js). Sem arte de celular publicada, nada muda: o
-- telemovel continua a mostrar a de desktop.
--
-- O painel so' pede a segunda arte onde as duas medidas SAO DIFERENTES. Nos
-- trilhos (160×600 nas duas pontas) e nas pastilhas do Camarote (240×80), uma
-- segunda zona so' faria subir o mesmo ficheiro duas vezes.
--
-- A funcao admin_rf98.publicidade() passa a devolver ficheiro_url_mob/mime_mob/
-- bytes_mob, que e' como a ficha do espaco diz se a arte de celular ja' existe.
-- ============================================================

alter table elifoot_v3.ad_creatives
  add column if not exists ficheiro_url_mob  text,
  add column if not exists ficheiro_path_mob text,
  add column if not exists mime_mob          text,
  add column if not exists bytes_mob         bigint;

comment on column elifoot_v3.ad_creatives.ficheiro_url_mob is 'Arte do telemóvel (medida mw×mh do espaço). Vazio = o telemóvel usa a arte de desktop.';

-- admin_rf98.publicidade() foi recriada na mesma leva para devolver as colunas
-- novas dentro de `criativo` — a definicao completa esta' no painel do Supabase.
