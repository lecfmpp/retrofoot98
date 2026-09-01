-- ============================================================
-- ESPACO NOVO: TOPO DO E-MAIL DO TREINADOR
-- Aplicado em 2026-09-01.
--
-- Faixa DENTRO da mensagem aberta, acima do assunto. E' o unico lugar do jogo em
-- que o utilizador esta' a LER, e nao a passar os olhos: toda proposta por
-- jogador, convite de outro clube, aviso da diretoria e premiacao passa por ali.
--
-- Desenhado por rfEmLeituraHTML (public/src/ui/rf26-email-config.js) e desligavel
-- pelo painel como os outros (ad_spaces.ligado).
-- ============================================================

insert into elifoot_v3.ad_spaces
  (chave, nome, iab, local, tipo, w, h, mw, mh, formatos, peso_kb, ord, dur_max_s, sem_audio, nota)
values
 ('rf98.email.topo','Topo do e-mail','IAB Leaderboard 728×90 / Mobile Banner 320×50',
  'E-mail do treinador — faixa no topo da mensagem aberta','pagina',728,90,320,50,
  array['JPG','PNG','WEBP'],120,7,null,true,
  'Fica DENTRO da mensagem, acima do assunto — o treinador está a ler quando ela aparece. Toda proposta por jogador, convite de clube, aviso da diretoria e premiação passa por aqui.')
on conflict (chave) do nothing;
