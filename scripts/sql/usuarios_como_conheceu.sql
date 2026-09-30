-- 30/09/2026 — "Como conheceu o jogo?" na tela Usuários do painel.
-- O jogo grava no cadastro (ver public/src/ui/rf-idade.js, RF_COMO), em auth.users.raw_user_meta_data:
--   como_conheceu        'google' | 'amigos' | 'instagram' | 'tiktok' | 'youtube' | 'outros'
--   como_conheceu_outro  texto livre do "Outros" (até 60 caracteres) ou nulo
-- Esta migração (aplicada como usuarios_como_conheceu) só acrescenta os dois campos ao retorno de
-- admin_rf98.usuarios. Mesma assinatura: os grants ficam. Contas anteriores a 30/09/2026: nulo.
do $$
declare d text;
begin
  d := pg_get_functiondef('admin_rf98.usuarios(text,integer)'::regprocedure);
  d := replace(d, $a$nullif(u.raw_user_meta_data->>'jogos_outro','') jogos_outro$a$,
                  $a$nullif(u.raw_user_meta_data->>'jogos_outro','') jogos_outro,
           case when u.raw_user_meta_data->>'como_conheceu' in ('google','amigos','instagram','tiktok','youtube','outros')
                then u.raw_user_meta_data->>'como_conheceu' end como_conheceu,
           nullif(left(u.raw_user_meta_data->>'como_conheceu_outro', 60),'') como_conheceu_outro$a$);
  d := replace(d, $a$'jogos_outro', b.jogos_outro,$a$,
                  $a$'jogos_outro', b.jogos_outro,
           'como_conheceu', b.como_conheceu,
           'como_conheceu_outro', b.como_conheceu_outro,$a$);
  if d not like '%b.como_conheceu_outro%' or d not like '%) como_conheceu,%' then raise exception 'replace falhou'; end if;
  execute d;
end $$;
