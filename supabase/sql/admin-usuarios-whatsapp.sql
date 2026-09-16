-- 16/09/2026 — WhatsApp do cadastro na tela Usuários do painel.
-- O jogo grava o número em auth.users.raw_user_meta_data (whatsapp = '+5511987654321',
-- whatsapp_pais = 'BR'); ver public/src/ui/rf-whatsapp.js. Esta migração (aplicada como
-- admin_usuarios_whatsapp) só acrescenta os dois campos ao retorno de admin_rf98.usuarios
-- e deixa a busca achar pelo número (só dígitos). Mesma assinatura: os grants ficam.
do $$
declare d text;
begin
  d := pg_get_functiondef('admin_rf98.usuarios(text,integer)'::regprocedure);
  d := replace(d, $a$coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'nome') nome_meta$a$,
                  $a$coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'nome') nome_meta,
           nullif(u.raw_user_meta_data->>'whatsapp','') whatsapp,
           nullif(u.raw_user_meta_data->>'whatsapp_pais','') whatsapp_pais$a$);
  d := replace(d, $a$'email', b.email, 'clube'$a$, $a$'email', b.email, 'whatsapp', b.whatsapp, 'whatsapp_pais', b.whatsapp_pais, 'clube'$a$);
  d := replace(d, $a$or b.email                 ilike '%'||p_busca||'%'$a$,
                  $a$or b.email                 ilike '%'||p_busca||'%'
       or (nullif(regexp_replace(p_busca,'\D','','g'),'') is not null
           and coalesce(b.whatsapp,'') like '%'||regexp_replace(p_busca,'\D','','g')||'%')$a$);
  if d not like '%b.whatsapp_pais%' or d not like '%regexp_replace(p_busca%' then raise exception 'replace falhou'; end if;
  execute d;
end $$;
