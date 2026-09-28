-- ===== ORIGEM: ANÚNCIO PAGO × ORGÂNICO NO INSTAGRAM/FACEBOOK (27/09/2026) =====
-- Substitui admin_rf98.origem_canal (origem_cadastro.sql). Antes: "Meta Ads" só com utm_medium pago
-- e tudo o resto de IG/FB num balde "Instagram/Facebook". Agora quatro canais:
--   · Meta Ads — Instagram / Meta Ads — Facebook: utm_medium pago (cpc, cpm, paid, paid_social, ads)
--     OU ids de campanha/anúncio na URL (campaign_id, ad_id — só um anúncio os carrega). A rede sai
--     do utm_source ({{site_source_name}} do Gerenciador: ig, fb, msg, an) ou do posicionamento.
--   · Instagram orgânico / Facebook orgânico: utm_source da rede sem mídia paga (bio, stories, post),
--     ou referrer instagram.com / facebook.com, ou só o fbclid (que vem em QUALQUER clique saído das
--     redes — sem prova de anúncio, conta como orgânico; se vier de anúncio sem os parâmetros de URL,
--     o erro é de configuração do anúncio, ver docs/rastreamento-origem.md). Só o fbclid, sem outra
--     pista da rede, sai como 'Instagram/Facebook orgânico'; ids de anúncio sem rede, 'Meta Ads — rede não informada'.
-- Contas já gravadas são reclassificadas sozinhas (o canal é calculado na leitura).

create or replace function admin_rf98.origem_canal(t jsonb)
returns text language sql immutable as $$
  with x as (
    select lower(coalesce(t->>'source',''))    s,
           lower(coalesce(t->>'medium',''))    m,
           lower(coalesce(t->>'referrer',''))  r,
           lower(coalesce(t->>'placement','') || ' ' || coalesce(t->>'term','')) pl,
           (coalesce(t->>'campaign_id','') <> '' or coalesce(t->>'ad_id','') <> '' or coalesce(t->>'adset_id','') <> '') ids
  ), y as (
    select *,
      (m ~ 'cpc|ppc|cpm|paid|ads' or (ids and (s ~ '^(ig|fb|msg|an|meta|instagram|facebook|threads)$' or s = ''))) pago,
      (s ~ '^(ig|instagram|threads)$' or s ~ 'instagram' or pl ~ 'instagram|reels|ig_') rede_ig,
      (s ~ '^(fb|facebook|msg|messenger|an|audience_network)$' or s ~ 'facebook' or pl ~ 'facebook|feed_fb|fb_|marketplace|messenger') rede_fb
    from x
  )
  select case
    when t is null or jsonb_typeof(t) <> 'object'                          then 'Desconhecido'
    when coalesce(t->>'ref','') <> ''                                      then 'Parceiro'
    when coalesce(t->>'sala','') <> ''                                     then 'Convite da Resenha'
    when coalesce(t->>'gclid','') <> ''
      or (s ~ 'google|youtube' and m ~ 'cpc|ppc|paid|ads')                 then 'Google Ads'
    when pago and rede_ig                                                  then 'Meta Ads — Instagram'
    when pago and (rede_fb or s = 'meta')                                  then 'Meta Ads — Facebook'
    when pago and ids                                                      then 'Meta Ads — rede não informada'
    when m ~ 'cpc|ppc|cpm|paid|ads'                                        then 'Outros anúncios'
    when s ~ 'youtube|^yt$'            or r ~ '(^|\.)youtube\.com|youtu\.be' then 'YouTube'
    when rede_ig or r ~ 'instagram\.com'                                   then 'Instagram orgânico'
    when rede_fb or r ~ 'facebook\.com|(^|\.)fb\.com|fb\.me'               then 'Facebook orgânico'
    when coalesce(t->>'fbclid','') <> ''                                   then 'Instagram/Facebook orgânico'
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
  end from y
$$;
