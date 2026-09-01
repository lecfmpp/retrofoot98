-- ============================================================
-- INTERRUPTOR POR ESPACO DE PUBLICIDADE
-- Aplicado em 2026-09-01.
--
-- Ate' aqui um espaco era SEMPRE desenhado: com o criativo quando havia, e com o
-- marcador do formato quando nao havia. Isso e' de proposito -- e' o que deixa ver
-- o inventario na tela e conferir se ele cabe no desenho. Faltava a terceira
-- hipotese: "este lugar nao existe nesta tela", sem ser preciso mexer no codigo.
--
-- `ligado = false` faz o jogo nao desenhar NADA naquele lugar: nem o criativo, nem
-- o marcador, nem o criativo de casa. E DESLIGAR NAO MEXE NO CRIATIVO -- ele fica
-- publicado e volta inteiro quando o espaco for ligado outra vez. E' um
-- interruptor, nao um "tirar do ar".
--
-- SEM BURACO NO LAYOUT, que e' a parte que da' trabalho. Tirar o elemento chega
-- para quem e' filho direto de uma coluna (sem elemento, sem `gap`), mas nao para
-- quem vive dentro de um contentor proprio:
--
--   · os trilhos 160x600 -- o contentor `[data-ad-rail]` sai junto, senao ficava
--     uma coluna de 160px de nada ao lado do conteudo;
--   · a banda do Camarote -- o lugar desligado nao entra, e com os cinco
--     desligados a banda inteira sai em vez de ficar uma moldura vazia;
--   · as placas do campo -- estas NAO desaparecem: sao a moldura do estadio, tres
--     de cada lado, e tirar as seis colapsaria o desenho. Desligadas, voltam ao
--     rotulo de casa, que e' como o campo era antes de elas serem inventario.
--
-- O jogo le' os desligados numa segunda leitura publica (`ligado=eq.false`), que
-- devolve zero linhas no caso normal. Chave desconhecida conta como LIGADA: uma
-- leitura falhada nunca pode apagar um lugar da tela.
-- ============================================================

alter table elifoot_v3.ad_spaces add column if not exists ligado boolean not null default true;

comment on column elifoot_v3.ad_spaces.ligado is 'false = o jogo NÃO desenha este espaço (nem o criativo, nem o marcador, nem o criativo de casa). O lugar some da tela sem deixar buraco — ver rfAdEspaco em public/src/ui/rf26.js.';
