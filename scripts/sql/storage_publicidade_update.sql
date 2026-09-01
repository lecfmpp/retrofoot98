-- ============================================================
-- BUCKET publicidade — FALTAVA A PERMISSAO DE REESCRITA
-- Aplicado em 2026-09-01.
--
-- O bucket nasceu com tres politicas: leitura publica, INSERT e DELETE para
-- quem tem a area 'publicidade' no painel. Nao tinha UPDATE.
--
-- Enquanto cada publicacao criava um ficheiro NOVO (o nome leva a hora), isso
-- nunca apareceu. Apareceu com a MORADA FIXA do cartao de partilha
-- (<chave>/atual.png, ver CHAVES_MORADA_FIXA em public/admin/admin.js): esse
-- ficheiro e' sempre o mesmo, e reescreve-lo e' um UPDATE.
--
-- O painel tem um caminho de recurso (apaga e sobe de novo, com as permissoes
-- que sempre teve), mas a politica devia existir: sem ela, o `upsert` normal
-- falha e o cartao de partilha fica por publicar enquanto o criativo entra no
-- ar no jogo -- uma metade publicada e outra nao.
-- ============================================================

create policy pub_ads_update on storage.objects
  for update
  using       (bucket_id = 'publicidade' and admin_rf98.pode('publicidade'))
  with check  (bucket_id = 'publicidade' and admin_rf98.pode('publicidade'));
