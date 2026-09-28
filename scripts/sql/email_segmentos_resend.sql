-- ===== SEGMENTOS DO RESEND SINCRONIZADOS COM O JOGO (28/09/2026) =====
-- Pedido do dono: segmentos no Resend de acordo com a evolução do jogador, com foco em conversão.
--
-- COMO FUNCIONA (tudo no banco, sem edge function):
--   email_estado()    calcula, para cada conta (menos sócios), em que segmentos ela deveria estar.
--   email_planejar()  compara com o que já foi mandado (email_sync) e põe as diferenças na fila
--                     (email_fila): criar contato, entrar/sair de segmento. Cron a cada 10 min.
--   email_despachar() manda UMA chamada por vez ao Resend (cron a cada 2 s = 0,5 req/s — o limite
--                     do Resend é por conta e a conta é dividida com a WiseFunnel), confere as
--                     respostas anteriores e devolve à fila o que deu 429/5xx (até 5 tentativas).
-- O pg_net só faz GET/POST/DELETE (sem PATCH), por isso os contatos levam só e-mail e primeiro nome;
-- a segmentação é toda por SEGMENTO. Descadastro ("Não quero mais receber") fica no Resend e nunca é
-- sobrescrito daqui.
--
-- ETAPA (exclusiva — cada conta está em uma só):
--   e0_nao_jogou   conta sem save do Solo                                  → ativação
--   e1_parou_r1    1ª temporada, rodada ≤ 1 (o maior vazamento: ~160 contas em 28/09)
--   e2_t1_comeco   1ª temporada, rodadas 2–10
--   e3_t1_meio     1ª temporada, rodadas 11–30
--   e4_t1_reta     1ª temporada, rodada 31+ (vai bater no paywall)
--   e5_travado     viu o paywall e não seguiu (nem grátis nem Pro)         → CONVERSÃO, o mais quente
--   e6_extra       grátis depois da 1ª temporada (depoimento/post/veterano) → conversão
--   e7_pro         Pro ativo                                               → fora de venda
--   e8_ex_pro      já pagou no Stripe e hoje não é Pro                     → recuperar
-- TRANSVERSAIS: todos (newsletter), inativos_7d (sem interação/jogo há 7+ dias), sem_time (não
-- respondeu o time do coração).

create table if not exists admin_rf98.email_segmentos (
  chave text primary key, segment_id text not null unique, nome text not null);
create table if not exists admin_rf98.email_sync (
  user_id uuid primary key, email text not null, segs text[] not null default '{}',
  atualizado_em timestamptz not null default now());
create table if not exists admin_rf98.email_fila (
  id bigserial primary key, user_id uuid, metodo text not null check (metodo in ('POST','DELETE')),
  caminho text not null, corpo jsonb, criado_em timestamptz not null default now(),
  enviado_em timestamptz, request_id bigint, status int, tentativas int not null default 0);
create index if not exists email_fila_pendente on admin_rf98.email_fila (id) where enviado_em is null;
create index if not exists email_fila_conferir on admin_rf98.email_fila (id) where request_id is not null and status is null;
alter table admin_rf98.email_segmentos enable row level security;
alter table admin_rf98.email_sync enable row level security;
alter table admin_rf98.email_fila enable row level security;

insert into admin_rf98.email_segmentos (chave, segment_id, nome) values
  ('todos',        'b74c4dea-e6ad-40cf-b12c-dc2d74ac136d', 'RF · Todos (newsletter)'),
  ('e0_nao_jogou', '9e3b886b-e076-4263-8ed3-7df8bdede6e2', 'RF · 0 Cadastrou e não jogou'),
  ('e1_parou_r1',  '3cbd68cd-1a80-460b-ad1c-5434d095a2d2', 'RF · 1 Parou antes da 2ª rodada'),
  ('e2_t1_comeco', '54ba224c-a3cc-4aaf-a35d-47ec21b6e69f', 'RF · 2 T1 começo (rodadas 2–10)'),
  ('e3_t1_meio',   'b0de056e-358d-4097-a70b-4e26c96c6bfb', 'RF · 3 T1 meio (rodadas 11–30)'),
  ('e4_t1_reta',   'd9209c8f-3167-4592-853f-a4664b4be3a2', 'RF · 4 T1 reta final (rodada 31+)'),
  ('e5_travado',   'fa940378-0962-40a6-b6db-2175bbb892f5', 'RF · 5 Travado no paywall'),
  ('e6_extra',     '1faaeffc-6809-4dd2-ab35-bfe9209eb477', 'RF · 6 Temporada extra grátis'),
  ('e7_pro',       '7d857aa6-2cb9-4d61-88eb-e772e502ffc8', 'RF · 7 Pro ativo'),
  ('e8_ex_pro',    '3e5f052a-81aa-4369-90c7-82e5e3c33400', 'RF · 8 Ex-Pro (cancelou)'),
  ('inativos_7d',  '76792d27-5254-49c8-b2b1-563ea932351d', 'RF · Inativos 7+ dias'),
  ('sem_time',     '6598e8b2-39f2-43f9-aafb-622f18d2cc0f', 'RF · Sem time do coração')
on conflict (chave) do update set segment_id = excluded.segment_id, nome = excluded.nome;

create or replace function admin_rf98.email_estado()
returns table (user_id uuid, email text, nome text, etapa text, segs text[])
language sql stable security definer set search_path = admin_rf98, public as $$
  with s as (
    select distinct on (ss.user_id) ss.user_id, ss.rodada, ss.temporadas_fechadas, ss.updated_at
      from elifoot_v3.solo_saves ss order by ss.user_id, ss.updated_at desc),
  pw as (
    select pe.user_id, max(pe.criado_em) filter (where pe.evento = 'exibido') exib,
           max(pe.criado_em) filter (where pe.evento = 'seguiu_gratis') seguiu
      from elifoot_v3.paywall_eventos pe group by 1),
  pro as (
    select up.user_id from elifoot_v3.user_plans up
     where up.plan = 'pro' and (up.until is null or up.until > now())),
  pagou as (select distinct sp.user_id from admin_rf98.stripe_pagamentos sp where sp.user_id is not null),
  base as (
    select u.id, lower(u.email) email,
           nullif(split_part(trim(coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'nome', '')), ' ', 1), '') nome,
           u.raw_user_meta_data->>'time_coracao' time_coracao,
           greatest(u.last_sign_in_at, ui.ultima, s.updated_at, u.created_at) ultima_vez,
           s.user_id is not null tem_save, s.rodada, s.temporadas_fechadas,
           pw.exib, pw.seguiu, pro.user_id is not null eh_pro, pagou.user_id is not null ja_pagou
      from auth.users u
      left join s on s.user_id = u.id
      left join pw on pw.user_id = u.id
      left join pro on pro.user_id = u.id
      left join pagou on pagou.user_id = u.id
      left join elifoot_v3.user_interacao ui on ui.user_id = u.id
     where u.email is not null and u.deleted_at is null
       and not exists (select 1 from admin_rf98.adm_users a where a.user_id = u.id and a.papel = 'socio')),
  et as (
    select b.*, case
      when b.eh_pro then 'e7_pro'
      when b.ja_pagou then 'e8_ex_pro'
      when b.exib is not null and (b.seguiu is null or b.seguiu < b.exib) then 'e5_travado'
      when not b.tem_save then 'e0_nao_jogou'
      when coalesce(b.temporadas_fechadas, 0) >= 1 then 'e6_extra'
      when b.rodada <= 1 then 'e1_parou_r1'
      when b.rodada <= 10 then 'e2_t1_comeco'
      when b.rodada <= 30 then 'e3_t1_meio'
      else 'e4_t1_reta' end etapa
    from base b)
  select et.id, et.email, et.nome, et.etapa,
         array_remove(array['todos', et.etapa,
           case when et.ultima_vez < now() - interval '7 days' then 'inativos_7d' end,
           case when et.time_coracao is null then 'sem_time' end], null)
    from et;
$$;

-- e-mail no caminho da URL do Resend (/contacts/{email}/segments/{id}): '+' e afins codificados
create or replace function admin_rf98.email_url(e text) returns text language sql immutable as $$
  select replace(replace(replace(replace(e, '%', '%25'), '+', '%2B'), '/', '%2F'), '?', '%3F');
$$;

create or replace function admin_rf98.email_planejar()
returns int language plpgsql security definer set search_path = admin_rf98, public as $$
declare r record; antigos text[]; k text; n int := 0;
begin
  for r in select e.*, sy.segs old_segs, sy.user_id tem_sync
             from admin_rf98.email_estado() e left join admin_rf98.email_sync sy on sy.user_id = e.user_id
            where sy.user_id is null or sy.segs is distinct from e.segs loop
    if r.tem_sync is null then
      -- contato novo: cria (409 = já existe na conta, tudo bem) e depois entra nos segmentos
      insert into admin_rf98.email_fila (user_id, metodo, caminho, corpo)
        values (r.user_id, 'POST', '/contacts',
                jsonb_strip_nulls(jsonb_build_object('email', r.email, 'first_name', r.nome)));
      antigos := '{}';
    else
      antigos := r.old_segs;
    end if;
    foreach k in array r.segs loop
      if not (k = any(antigos)) then
        insert into admin_rf98.email_fila (user_id, metodo, caminho)
          select r.user_id, 'POST', '/contacts/' || admin_rf98.email_url(r.email) || '/segments/' || sg.segment_id
            from admin_rf98.email_segmentos sg where sg.chave = k;
      end if;
    end loop;
    foreach k in array antigos loop
      if not (k = any(r.segs)) then
        insert into admin_rf98.email_fila (user_id, metodo, caminho)
          select r.user_id, 'DELETE', '/contacts/' || admin_rf98.email_url(r.email) || '/segments/' || sg.segment_id
            from admin_rf98.email_segmentos sg where sg.chave = k;
      end if;
    end loop;
    insert into admin_rf98.email_sync (user_id, email, segs) values (r.user_id, r.email, r.segs)
      on conflict (user_id) do update set segs = excluded.segs, email = excluded.email, atualizado_em = now();
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function admin_rf98.email_despachar()
returns void language plpgsql security definer set search_path = admin_rf98, public as $$
declare f record; chave text; hdr jsonb; rid bigint;
begin
  -- 1) confere as respostas do que já foi: 429/5xx/sem resposta há 2 min voltam para a fila
  update admin_rf98.email_fila q set status = coalesce(h.status_code, 0)
    from net._http_response h where h.id = q.request_id and q.status is null;
  update admin_rf98.email_fila q set enviado_em = null, request_id = null, status = null, tentativas = tentativas + 1
   where q.tentativas < 5 and (q.status = 429 or q.status >= 500 or q.status = 0
      -- entrar em segmento antes de o contato existir (a criação ainda não tinha voltado): tenta de novo
      or (q.status = 404 and q.metodo = 'POST' and q.caminho like '/contacts/%/segments/%')
      or (q.status is null and q.request_id is not null and q.enviado_em < now() - interval '2 minutes'));

  -- 2) manda a próxima (uma por chamada)
  select * into f from admin_rf98.email_fila where enviado_em is null and tentativas < 5 order by id limit 1
    for update skip locked;
  if not found then return; end if;
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'RESEND_API_KEY_RETROFOOT';
  hdr := jsonb_build_object('Authorization', 'Bearer ' || chave, 'Content-Type', 'application/json');
  if f.metodo = 'POST' then
    rid := net.http_post(url := 'https://api.resend.com' || f.caminho, body := coalesce(f.corpo, '{}'::jsonb),
                         headers := hdr, timeout_milliseconds := 10000);
  else
    rid := net.http_delete(url := 'https://api.resend.com' || f.caminho, headers := hdr, timeout_milliseconds := 10000);
  end if;
  update admin_rf98.email_fila set enviado_em = now(), request_id = rid where id = f.id;
end $$;

revoke all on function admin_rf98.email_estado() from public, anon, authenticated;
revoke all on function admin_rf98.email_planejar() from public, anon, authenticated;
revoke all on function admin_rf98.email_despachar() from public, anon, authenticated;

-- resumo para conferir (e para o painel, se um dia quiser mostrar)
create or replace view admin_rf98.email_resumo as
  select sg.nome, count(sy.user_id) contas
    from admin_rf98.email_segmentos sg left join admin_rf98.email_sync sy on sg.chave = any(sy.segs)
   group by sg.nome order by sg.nome;
revoke all on admin_rf98.email_resumo from public, anon, authenticated;

select cron.schedule('email-planejar', '*/10 * * * *', 'select admin_rf98.email_planejar()');
select cron.schedule('email-despachar', '2 seconds', 'select admin_rf98.email_despachar()');

-- ===== 28/09: ETAPAS 0 E 1 FORA DOS ENVIOS EM MASSA (migração email_estado_fora_de_massa) =====
-- Pedido do dono. Os segmentos transversais (todos/newsletter, inativos_7d, sem_time) deixam de incluir:
--   · etapa e0_nao_jogou e e1_parou_r1 (recebem só envio dirigido, como a ativação);
--   · quem está na automação pós-cadastro: cadastrou DEPOIS que ela foi ligada (28/09 15:05 UTC) e há < 16 dias.
-- ATENÇÃO: a 1ª versão usava só "cadastrou há < 16 dias" e tirava quase a base toda (a maioria entrou nas
-- últimas semanas, ANTES de a automação existir) — a fila foi pausada e desfeita. O corte pela data de
-- ligação da automação é o que vale.
-- No email_estado(): coluna na_automacao =
--   (u.created_at >= timestamptz '2026-09-28 15:05:00+00' and u.created_at > now() - interval '16 days')
-- e em_massa = not (etapa in ('e0_nao_jogou','e1_parou_r1') or na_automacao); todos/inativos_7d/sem_time só se em_massa.
