-- ===== SOBRE O JOGO: respostas prontas, sem IA (28/09/2026) =====
-- Banco de perguntas e respostas que o painel consulta ANTES de chamar o Gemini. Se a pergunta
-- do suporte bate com uma resposta pronta, ela aparece na hora e sem gastar token; só o que não
-- está aqui vai para a IA.
--   · fonte 'claude' — geradas a partir de docs/conhecimento/ (os JSON em docs/conhecimento/faq/);
--   · fonte 'ia' / 'equipe' — resposta do Gemini marcada como boa e salva pelo painel.
-- CARGA: botão "Atualizar respostas prontas" do painel → sobre_faq_sincronizar() (fim deste ficheiro),
-- que lê os JSON direto da main no GitHub. scripts/build-faq.mjs só valida os JSON antes do push.
-- BUSCA (sobre_buscar): nota = metade semelhança por trigramas (contra a pergunta e cada
-- variação; vale a melhor) + metade cobertura (palavras da pergunta — sem acento, sem stopword,
-- com radical — presentes na resposta pronta, pesadas pela raridade). O corte mora no painel.
-- unaccent não é imutável (o dicionário pode mudar), por isso sj_norm/sj_doc embrulham e
-- se declaram imutáveis: é o que deixa o tsvector ser coluna gerada com índice.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function admin_rf98.sj_norm(t text) returns text
language sql immutable parallel safe
set search_path = extensions, pg_catalog
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t,''))) $$;

create or replace function admin_rf98.sj_doc(p text, v text[], t text[]) returns tsvector
language sql immutable parallel safe
set search_path = extensions, pg_catalog
as $$ select to_tsvector('portuguese'::regconfig, admin_rf98.sj_norm(coalesce(p,'') || ' ' || array_to_string(coalesce(v,'{}'), ' ') || ' ' || array_to_string(coalesce(t,'{}'), ' '))) $$;

create table if not exists admin_rf98.sobre_faq (
  id text primary key,
  pergunta text not null,
  variacoes text[] not null default '{}',
  resposta text not null,
  resposta_jogador text,
  tags text[] not null default '{}',
  fonte text not null default 'claude' check (fonte in ('claude','equipe','ia')),
  ativo boolean not null default true,
  usos integer not null default 0,
  criado_por uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  tsv tsvector generated always as (admin_rf98.sj_doc(pergunta, variacoes, tags)) stored
);
create index if not exists sobre_faq_tsv_idx on admin_rf98.sobre_faq using gin (tsv);
alter table admin_rf98.sobre_faq enable row level security;
create policy sobre_faq_sel on admin_rf98.sobre_faq for select to authenticated using (admin_rf98.is_admin());
grant select on admin_rf98.sobre_faq to authenticated;
grant all on admin_rf98.sobre_faq to service_role;

alter table admin_rf98.sobre_perguntas add column if not exists faq_id text;

-- BANCADA: chamada direta pelo SQL editor / MCP (sessão postgres, sem JWT) — para sincronizar e
-- calibrar a busca sem precisar de login de sócio. Pelo PostgREST a sessão é 'authenticator',
-- então isto nunca vale para quem chega pela API.
create or replace function admin_rf98.sj_bancada() returns boolean language sql stable as $$
  select session_user = 'postgres' and auth.uid() is null $$;

/* IDF e frases já normalizadas (28/09, calibrado com 30 perguntas reescritas + 8 fora do
   assunto): a cobertura pesa cada palavra pela raridade na base — "jogador", "time", "jogo"
   quase não contam —, o que baixou o melhor falso positivo de 0,50 para 0,42 sem perder os
   acertos. frases_norm guarda pergunta+variações sem acento: tirar acento de ~2.500 frases a
   cada busca custava 330 ms; pré-calculado, 50 ms (a busca roda enquanto se digita). */
create or replace function admin_rf98.sj_frases(p text, v text[]) returns text[]
language sql immutable parallel safe
set search_path = extensions, pg_catalog
as $$ select array(select admin_rf98.sj_norm(x) from unnest(coalesce(v,'{}') || p) x) $$;

alter table admin_rf98.sobre_faq add column if not exists frases_norm text[]
  generated always as (admin_rf98.sj_frases(pergunta, variacoes)) stored;

create or replace function admin_rf98.sobre_buscar(p_q text, p_lim int default 5)
returns table (id text, pergunta text, resposta text, resposta_jogador text, tags text[], fonte text, nota real)
language plpgsql stable security definer
set search_path = admin_rf98, extensions, public
as $$
declare nq text := admin_rf98.sj_norm(p_q);
        n real;
begin
  if not (admin_rf98.is_admin() or admin_rf98.sj_bancada()) then raise exception 'sem acesso'; end if;
  select count(*) into n from admin_rf98.sobre_faq f where f.ativo;
  return query
  with lex as (
    select to_tsquery('portuguese', quote_literal(l)) tq
    from unnest(tsvector_to_array(to_tsvector('portuguese', nq))) l
  ), w as (
    select lex.tq, ln((n + 1) / ((select count(*) from admin_rf98.sobre_faq f where f.ativo and f.tsv @@ lex.tq) + 1)) + 0.1 as peso
    from lex
  ), tot as (select nullif(sum(peso), 0) s from w),
  c as (
    select f.id, f.pergunta, f.resposta, f.resposta_jogador, f.tags, f.fonte, f.usos,
      (select max(extensions.similarity(nq, x)) from unnest(f.frases_norm) x) as sim,
      coalesce((select sum(w.peso) filter (where f.tsv @@ w.tq) from w) / (select s from tot), 0) as cob
    from admin_rf98.sobre_faq f where f.ativo
  )
  select c.id, c.pergunta, c.resposta, c.resposta_jogador, c.tags, c.fonte,
         (0.5*c.sim + 0.5*c.cob)::real as nota
  from c order by nota desc, c.usos desc limit greatest(1, least(p_lim, 20));
end $$;
grant execute on function admin_rf98.sobre_buscar(text, int) to authenticated;

-- a resposta pronta foi usada: conta o uso e deixa rastro no histórico (modelo 'base', custo zero)
create or replace function admin_rf98.sobre_usar_faq(p_pergunta text, p_faq text)
returns void language plpgsql security definer set search_path = admin_rf98, public as $$
begin
  if not admin_rf98.is_admin() then raise exception 'sem acesso'; end if;
  update admin_rf98.sobre_faq set usos = usos + 1 where id = p_faq;
  insert into admin_rf98.sobre_perguntas (user_id, pergunta, resposta, modelo, tokens_in, tokens_out, tokens_cache, custo_usd, faq_id)
  select auth.uid(), left(p_pergunta, 4000), f.resposta, 'base', 0, 0, 0, 0, f.id from admin_rf98.sobre_faq f where f.id = p_faq;
end $$;
grant execute on function admin_rf98.sobre_usar_faq(text, text) to authenticated;

-- salvar uma resposta (da IA, revisada) como resposta pronta; tirar uma do ar. Só sócio/produto.
create or replace function admin_rf98.sobre_faq_salvar(p_pergunta text, p_resposta text, p_jogador text default null, p_variacoes text[] default '{}', p_fonte text default 'ia')
returns text language plpgsql security definer set search_path = admin_rf98, public as $$
declare novo text;
begin
  if not exists (select 1 from admin_rf98.adm_users u where u.user_id = auth.uid() and u.estado = 'ativo' and u.papel in ('socio','produto'))
    then raise exception 'Só sócio ou produto pode editar as respostas prontas.'; end if;
  if coalesce(trim(p_pergunta),'') = '' or coalesce(trim(p_resposta),'') = '' then raise exception 'Pergunta e resposta são obrigatórias.'; end if;
  novo := 'eq-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);
  insert into admin_rf98.sobre_faq (id, pergunta, variacoes, resposta, resposta_jogador, fonte, criado_por)
  values (novo, trim(p_pergunta), coalesce(p_variacoes,'{}'), p_resposta, nullif(trim(coalesce(p_jogador,'')),''),
          case when p_fonte in ('equipe','ia') then p_fonte else 'ia' end, auth.uid());
  return novo;
end $$;
create or replace function admin_rf98.sobre_faq_desativar(p_id text)
returns void language plpgsql security definer set search_path = admin_rf98, public as $$
begin
  if not exists (select 1 from admin_rf98.adm_users u where u.user_id = auth.uid() and u.estado = 'ativo' and u.papel in ('socio','produto'))
    then raise exception 'Só sócio ou produto pode editar as respostas prontas.'; end if;
  update admin_rf98.sobre_faq set ativo = false, atualizado_em = now() where id = p_id;
end $$;
grant execute on function admin_rf98.sobre_faq_salvar(text, text, text, text[], text) to authenticated;
grant execute on function admin_rf98.sobre_faq_desativar(text) to authenticated;

/* SINCRONIZAR COM O GITHUB. As respostas 'claude' moram em docs/conhecimento/faq/*.json no repo
   (público). O botão "Atualizar respostas prontas" do painel chama isto: o banco lista a pasta na
   main pela API do GitHub, baixa cada JSON, valida TUDO e só então grava (upsert por id; as
   'claude' que sumiram dos JSON saem do ar; 'ia'/'equipe' nunca são tocadas; `usos` sobrevive).
   Assim atualizar as prontas é: editar o JSON → push na main → clicar. Nada de colar SQL. */
create or replace function admin_rf98.sobre_faq_sincronizar()
returns jsonb language plpgsql security definer
set search_path = admin_rf98, public, extensions
as $$
declare
  hdr public.http_header[] := array[public.http_header('User-Agent','retrofoot-painel'), public.http_header('Accept','application/vnd.github+json')];
  r public.http_response;
  arq jsonb; itens jsonb; q jsonb;
  ids text[] := '{}'; n_arq int := 0; n_novas int := 0; n_atual int := 0; n_desat int := 0;
begin
  if not (admin_rf98.sj_bancada() or exists (select 1 from admin_rf98.adm_users u
          where u.user_id = auth.uid() and u.estado = 'ativo' and u.papel in ('socio','produto')))
    then raise exception 'Só sócio ou produto pode atualizar as respostas prontas.'; end if;
  perform public.http_set_curlopt('CURLOPT_TIMEOUT', '20');

  r := public.http(('GET', 'https://api.github.com/repos/lecfmpp/retrofoot98/contents/docs/conhecimento/faq?ref=main', hdr, null, null)::public.http_request);
  if r.status <> 200 then raise exception 'GitHub respondeu % ao listar docs/conhecimento/faq.', r.status; end if;

  create temp table if not exists _faq_in (id text primary key, pergunta text, variacoes text[], resposta text, resposta_jogador text, tags text[]) on commit drop;
  truncate _faq_in;
  for arq in select * from jsonb_array_elements(r.content::jsonb) e where e->>'name' like '%.json' order by e->>'name' loop
    r := public.http(('GET', arq->>'download_url', array[public.http_header('User-Agent','retrofoot-painel')], null, null)::public.http_request);
    if r.status <> 200 then raise exception 'GitHub respondeu % para %.', r.status, arq->>'name'; end if;
    begin itens := r.content::jsonb;
    exception when others then raise exception '% não é JSON válido.', arq->>'name'; end;
    if jsonb_typeof(itens) <> 'array' then raise exception '% não é uma lista.', arq->>'name'; end if;
    n_arq := n_arq + 1;
    for q in select * from jsonb_array_elements(itens) loop
      if coalesce(q->>'id','') !~ '^\d\d-\d{3}$' or coalesce(trim(q->>'pergunta'),'') = '' or coalesce(trim(q->>'resposta'),'') = ''
        then raise exception 'Entrada inválida em %: %', arq->>'name', left(q::text, 120); end if;
      if (q->>'id') = any(ids) then raise exception 'id repetido: %', q->>'id'; end if;
      ids := ids || (q->>'id');
      insert into _faq_in values (q->>'id', trim(q->>'pergunta'),
        coalesce((select array_agg(trim(x)) from jsonb_array_elements_text(coalesce(q->'variacoes','[]')) x where trim(x) <> ''), '{}'),
        trim(q->>'resposta'), nullif(trim(coalesce(q->>'resposta_jogador','')), ''),
        coalesce((select array_agg(lower(trim(x))) from jsonb_array_elements_text(coalesce(q->'tags','[]')) x where trim(x) <> ''), '{}'));
    end loop;
  end loop;
  if n_arq = 0 then raise exception 'Nenhum JSON em docs/conhecimento/faq na main.'; end if;

  select count(*) into n_novas from _faq_in i where not exists (select 1 from admin_rf98.sobre_faq f where f.id = i.id);
  select count(*) into n_atual from _faq_in i join admin_rf98.sobre_faq f on f.id = i.id
   where (f.pergunta, f.variacoes, f.resposta, coalesce(f.resposta_jogador,''), f.tags, f.ativo)
      is distinct from (i.pergunta, i.variacoes, i.resposta, coalesce(i.resposta_jogador,''), i.tags, true);
  insert into admin_rf98.sobre_faq (id, pergunta, variacoes, resposta, resposta_jogador, tags, fonte)
  select id, pergunta, variacoes, resposta, resposta_jogador, tags, 'claude' from _faq_in
  on conflict (id) do update set pergunta = excluded.pergunta, variacoes = excluded.variacoes,
    resposta = excluded.resposta, resposta_jogador = excluded.resposta_jogador, tags = excluded.tags,
    ativo = true, atualizado_em = now()
  where (admin_rf98.sobre_faq.pergunta, admin_rf98.sobre_faq.variacoes, admin_rf98.sobre_faq.resposta,
         coalesce(admin_rf98.sobre_faq.resposta_jogador,''), admin_rf98.sobre_faq.tags, admin_rf98.sobre_faq.ativo)
     is distinct from (excluded.pergunta, excluded.variacoes, excluded.resposta, coalesce(excluded.resposta_jogador,''), excluded.tags, true);
  with d as (update admin_rf98.sobre_faq set ativo = false, atualizado_em = now()
              where fonte = 'claude' and ativo and id <> all (ids) returning 1)
  select count(*) into n_desat from d;
  return jsonb_build_object('arquivos', n_arq, 'total', cardinality(ids), 'novas', n_novas, 'atualizadas', n_atual, 'desativadas', n_desat);
end $$;
grant execute on function admin_rf98.sobre_faq_sincronizar() to authenticated;
