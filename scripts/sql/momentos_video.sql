-- ============================================================
-- OS MOMENTOS DO JOGO (modais com video) — RetroFoot98
-- Aplicado em 2026-09-01 (migracao momentos_video_inventario, ja no banco).
--
-- Os nove momentos viviam so' no codigo, em dois mapas de ui/main.js
-- (MOMENTO_DEFS e VIDEOS_MOMENTO): trocar um video obrigava a publicar o site,
-- e nao havia onde ler quando cada um aparece nem com que frequencia.
--
-- O QUE E' EDITAVEL E O QUE NAO E'. video_url, ativo e nota sao do painel. O
-- GATILHO continua no codigo, de proposito: "foi campeao da liga" e' regra de
-- jogo, nao configuracao. Mas fica aqui ESCRITO, para quem opera saber o que
-- dispara cada um sem ler main.js — e `frequencia` descreve o que o codigo ja'
-- garante (uma vez por temporada, por copa, por clube).
--
-- DOIS ESTAO ORFAOS: abertura-copa e final-copa tem modal, texto e botoes, e
-- nenhuma parte do codigo os dispara. Ficam na tabela marcados como SEM GATILHO
-- porque escondê-los seria fingir que o inventario esta' completo — subir video
-- para eles nao os faz aparecer.
-- ============================================================
-- (ver a migracao no banco para o DDL completo e o seed dos nove)

-- ============================================================
-- FREQUENCIA AJUSTAVEL (01/09) — migracao momentos_frequencia_ajustavel
--
-- POR QUE ESTES DOIS BOTOES E NAO UM "a cada N rodadas": os gatilhos ja' sao
-- eventos ("foi campeao", "a diretoria perdeu a paciencia"), nao um relogio.
-- Nao ha' intervalo a regular — ha' o que fazer QUANDO o evento acontece.
--
--   chance (0-100)     de cada vez que o gatilho dispara, com que probabilidade
--                      o modal aparece. E' o botao que tira o ar de roteiro:
--                      uma crise que aparece SEMPRE que a paciencia cai vira
--                      aviso de sistema; a 60% vira acontecimento.
--   max_por_temporada  teto por temporada. NULL = sem teto. Serve ao que pode
--                      repetir; o que a regra ja' limita a uma vez ignora.
--
-- O texto `frequencia` FICA: descreve o que o codigo garante ("uma vez por
-- copa, por temporada"), que e' outra coisa do que estes dois ajustam. Eles
-- afinam por cima da regra; nao a substituem.
--
-- A CONTAGEM DO TETO E' LOCAL (CL._momConta), nao vai para S: em sala de
-- Resenha o S e' estado partilhado, e um contador de modal do MEU clube nao tem
-- que viajar para os outros — nem a sorteada da chance pode divergir entre
-- clientes e mexer no que e' partilhado.
-- ============================================================
alter table elifoot_v3.momentos
  add column if not exists chance int not null default 100
    check (chance between 0 and 100),
  add column if not exists max_por_temporada int
    check (max_por_temporada is null or max_por_temporada > 0);
