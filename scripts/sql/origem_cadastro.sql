-- ===== ORIGEM DO CADASTRO (27/09/2026) =====
-- O jogo guarda no navegador o que trouxe a pessoa (public/src/net/origem.js) e o cadastro grava
-- isso em auth.users.raw_user_meta_data->'origem' = { primeiro:{...}, ultimo:{...}, ga }.
-- Cada toque: source/medium/campaign/content/term (UTM), gclid, fbclid, ref (parceiro),
-- sala (convite da Resenha), referrer (host+caminho de OUTRO site), pagina, em.
--
-- Aqui: (1) a função que transforma um toque em CANAL — o único lugar da regra, para o painel e
-- qualquer relatório futuro contarem igual; (2) o patch em admin_rf98.usuarios, que passa a
-- devolver 'origem' (cru), 'canal' (do último toque = o que levou ao cadastro) e 'canal_1'
-- (do primeiro toque). Contas criadas antes de 27/09 não têm origem → 'Desconhecido'.
--
-- O patch é por REPLACE com verificação (mesmo padrão de interacao_usuario.sql): se alguém
-- reescrever admin_rf98.usuarios, rodar este ficheiro de novo.

create or replace function admin_rf98.origem_canal(t jsonb)
returns text language sql immutable as $$
  with x as (
    select lower(coalesce(t->>'source',''))   s,
           lower(coalesce(t->>'medium',''))   m,
           lower(coalesce(t->>'referrer','')) r
  )
  select case
    when t is null or jsonb_typeof(t) <> 'object'                          then 'Desconhecido'
    when coalesce(t->>'ref','') <> ''                                      then 'Parceiro'
    when coalesce(t->>'sala','') <> ''                                     then 'Convite da Resenha'
    when coalesce(t->>'gclid','') <> ''
      or (s ~ 'google|youtube' and m ~ 'cpc|ppc|paid|ads')                 then 'Google Ads'
    when s ~ 'facebook|instagram|^fb$|^ig$|meta' and m ~ 'cpc|ppc|paid|ads' then 'Meta Ads'
    when m ~ 'cpc|ppc|paid|ads'                                            then 'Outros anúncios'
    when s ~ 'youtube|^yt$'            or r ~ '(^|\.)youtube\.com|youtu\.be' then 'YouTube'
    when s ~ 'instagram|facebook|^fb$|^ig$' or coalesce(t->>'fbclid','') <> ''
      or r ~ 'instagram\.com|facebook\.com|(^|\.)fb\.com|fb\.me'             then 'Instagram/Facebook'
    when s ~ 'whats|wpp|^wa$'          or r ~ 'whatsapp|wa\.me'              then 'WhatsApp'
    when s ~ 'tiktok'                  or r ~ 'tiktok\.com'                  then 'TikTok'
    when s ~ 'twitter|^x$'             or r ~ '^t\.co|(^|\.)x\.com|twitter\.com' then 'X/Twitter'
    when s ~ 'mail|newsletter' or m ~ 'mail'                               then 'E-mail'
    when s <> ''                                                           then 'Outra campanha'
    when r ~ '(^|\.)google\.'                                              then 'Google orgânico'
    when r ~ 'bing\.|duckduckgo|yahoo\.|ecosia|brave\.com'                 then 'Outras buscas'
    when r ~ 'chatgpt|openai|perplexity|claude\.ai|gemini|copilot'         then 'IA (ChatGPT etc.)'
    when r ~ 'reddit\.com'                                                 then 'Reddit'
    when r <> ''                                                           then 'Outro site'
    else 'Direto'
  end from x
$$;

do $patch$
declare d text; n text;
begin
  select pg_get_functiondef('admin_rf98.usuarios(text,integer)'::regprocedure) into d;
  if position('''canal''' in d) > 0 then raise notice 'usuarios já tem canal — nada a fazer'; return; end if;
  n := replace(d,
    $a$nullif(u.raw_user_meta_data->>'whatsapp_pais','') whatsapp_pais$a$,
    $a$nullif(u.raw_user_meta_data->>'whatsapp_pais','') whatsapp_pais,
           u.raw_user_meta_data->'origem' origem$a$);
  n := replace(n,
    $a$'referral', r.codigo, 'parceiro', pa.nome) j,$a$,
    $a$'referral', r.codigo, 'parceiro', pa.nome,
      'origem', b.origem,
      'canal',   admin_rf98.origem_canal(b.origem->'ultimo'),
      'canal_1', admin_rf98.origem_canal(b.origem->'primeiro')) j,$a$);
  if position('->''origem'' origem' in n) = 0 or position('origem_canal(b.origem' in n) = 0 then
    raise exception 'patch da origem não encaixou em admin_rf98.usuarios — conferir a definição atual';
  end if;
  execute n;
end $patch$;
