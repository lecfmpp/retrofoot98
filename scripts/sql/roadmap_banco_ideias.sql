-- ===== BANCO DE IDEIAS → APROVAÇÃO DOS SÓCIOS → ROADMAP (27/09/2026) =====
-- A página "Funcionalidades" do painel virou "Roadmap", com duas abas:
--   · BANCO DE IDEIAS — admin_rf98.adm_features (os cards de antes, agora itens de lista). Toda ideia
--     nasce 'pendente' e precisa da aprovação dos SÓCIOS ATIVOS (hoje 3). A coluna do quadro antigo
--     (coluna_id) fica só como "etapa antiga", para filtrar.
--   · ROADMAP — elifoot_v3.roadmap_itens, o MESMO que aparece em /roadmap/ (roadmap_publico.sql).
-- Regra: todos os sócios ativos aprovam → a ideia vira item do roadmap em 'planejado' (V2), publicado.
--        maioria dos sócios recusa → 'recusada'. Quem votou pode mudar o voto enquanto não fechou.
-- Tudo por admin_rf98.ideia_decidir (security definer): confere que é sócio, grava o voto, recalcula,
-- promove e registra no Registro de ações. Um gatilho impede marcar 'aprovada' por fora da função.
-- Futuro: o leitor do WhatsApp (mensagens e áudios) insere aqui com origem 'whatsapp' — as colunas
-- fonte/fonte_ref já existem para isso.

alter table admin_rf98.adm_features add column if not exists ideia_status text not null default 'pendente';
alter table admin_rf98.adm_features drop constraint if exists adm_features_ideia_status_chk;
alter table admin_rf98.adm_features add constraint adm_features_ideia_status_chk
  check (ideia_status in ('pendente','aprovada','recusada','arquivada'));
alter table admin_rf98.adm_features add column if not exists roadmap_item_id uuid references elifoot_v3.roadmap_itens(id) on delete set null;
alter table admin_rf98.adm_features add column if not exists decidida_em timestamptz;
alter table admin_rf98.adm_features add column if not exists fonte text;       -- 'painel' | 'opiniao' | 'whatsapp' (futuro)
alter table admin_rf98.adm_features add column if not exists fonte_ref text;   -- id da mensagem/áudio de origem

create table if not exists admin_rf98.ideia_votos (
  ideia_id uuid not null references admin_rf98.adm_features(id) on delete cascade,
  user_id  uuid not null,
  decisao  text not null check (decisao in ('aprovar','recusar')),
  em       timestamptz not null default now(),
  primary key (ideia_id, user_id)
);
alter table admin_rf98.ideia_votos enable row level security;
drop policy if exists ideia_votos_sel on admin_rf98.ideia_votos;
create policy ideia_votos_sel on admin_rf98.ideia_votos for select to authenticated using (admin_rf98.is_admin());

create or replace function admin_rf98.is_socio() returns boolean language sql stable security definer
set search_path = admin_rf98, public as $$
  select exists (select 1 from admin_rf98.adm_users u where u.user_id = auth.uid() and u.estado = 'ativo' and u.papel = 'socio');
$$;

-- o roadmap público só é mexido por sócio (antes: qualquer admin)
drop policy if exists roadmap_itens_admin on elifoot_v3.roadmap_itens;
drop policy if exists roadmap_itens_sel_admin on elifoot_v3.roadmap_itens;
drop policy if exists roadmap_itens_socio on elifoot_v3.roadmap_itens;
create policy roadmap_itens_sel_admin on elifoot_v3.roadmap_itens for select to authenticated using (admin_rf98.is_admin());
create policy roadmap_itens_socio on elifoot_v3.roadmap_itens for all to authenticated
  using (admin_rf98.is_socio()) with check (admin_rf98.is_socio());

-- 'aprovada' só pela função (que liga rf.ideia_ok na própria transação)
create or replace function admin_rf98.ideia_guarda() returns trigger language plpgsql as $$
begin
  if new.ideia_status = 'aprovada' and old.ideia_status is distinct from 'aprovada'
     and coalesce(current_setting('rf.ideia_ok', true), '') <> '1' then
    raise exception 'Ideia só vira aprovada pelo voto dos sócios';
  end if;
  return new;
end $$;
drop trigger if exists ideia_guarda on admin_rf98.adm_features;
create trigger ideia_guarda before update on admin_rf98.adm_features
  for each row execute function admin_rf98.ideia_guarda();

create or replace function admin_rf98.ideia_decidir(p_ideia uuid, p_decisao text)
returns jsonb language plpgsql security definer set search_path = admin_rf98, public as $$
declare v_f admin_rf98.adm_features; n_socios int; n_ok int; n_nao int; v_item uuid; v_email text; v_status text;
begin
  if not admin_rf98.is_socio() then raise exception 'Só sócio aprova ou recusa ideias' using errcode = '42501'; end if;
  if p_decisao is not null and p_decisao not in ('aprovar','recusar') then raise exception 'decisão inválida'; end if;
  select * into v_f from admin_rf98.adm_features where id = p_ideia for update;
  if not found then raise exception 'Ideia não encontrada'; end if;
  if v_f.ideia_status in ('aprovada','recusada') then raise exception 'Esta ideia já foi decidida'; end if;

  if p_decisao is null then
    delete from admin_rf98.ideia_votos where ideia_id = p_ideia and user_id = auth.uid();
  else
    insert into admin_rf98.ideia_votos (ideia_id, user_id, decisao) values (p_ideia, auth.uid(), p_decisao)
    on conflict (ideia_id, user_id) do update set decisao = excluded.decisao, em = now();
  end if;

  select count(*) into n_socios from admin_rf98.adm_users where estado = 'ativo' and papel = 'socio';
  select count(*) filter (where v.decisao = 'aprovar'), count(*) filter (where v.decisao = 'recusar')
    into n_ok, n_nao
    from admin_rf98.ideia_votos v join admin_rf98.adm_users u on u.user_id = v.user_id and u.estado = 'ativo' and u.papel = 'socio'
   where v.ideia_id = p_ideia;
  v_status := case when n_socios > 0 and n_ok >= n_socios then 'aprovada'
                   when n_nao * 2 > n_socios then 'recusada'
                   else coalesce(nullif(v_f.ideia_status, 'arquivada'), 'pendente') end;
  select email into v_email from auth.users where id = auth.uid();

  if v_status = 'aprovada' then
    insert into elifoot_v3.roadmap_itens (titulo, descricao, status, versao, ord, publicado)
    values (v_f.titulo, coalesce(nullif(v_f.descricao, ''), v_f.nota), 'planejado', 'v2',
            coalesce((select max(ord) from elifoot_v3.roadmap_itens), 0) + 10, true)
    returning id into v_item;
    perform set_config('rf.ideia_ok', '1', true);
    update admin_rf98.adm_features set ideia_status = 'aprovada', roadmap_item_id = v_item, decidida_em = now() where id = p_ideia;
    perform set_config('rf.ideia_ok', '', true);   -- a liberação vale só para esta linha
    insert into admin_rf98.adm_audit (quem, quem_email, acao, alvo, detalhe)
    values (auth.uid(), v_email, 'ideia.aprovada', v_f.titulo, jsonb_build_object('ideia_id', p_ideia, 'roadmap_item_id', v_item));
  elsif v_status = 'recusada' then
    update admin_rf98.adm_features set ideia_status = 'recusada', decidida_em = now() where id = p_ideia;
    insert into admin_rf98.adm_audit (quem, quem_email, acao, alvo, detalhe)
    values (auth.uid(), v_email, 'ideia.recusada', v_f.titulo, jsonb_build_object('ideia_id', p_ideia));
  else
    update admin_rf98.adm_features set ideia_status = v_status where id = p_ideia and ideia_status <> v_status;
  end if;
  insert into admin_rf98.adm_audit (quem, quem_email, acao, alvo, detalhe)
  values (auth.uid(), v_email, 'ideia.voto', v_f.titulo, jsonb_build_object('ideia_id', p_ideia, 'decisao', p_decisao));

  return jsonb_build_object('status', v_status, 'aprovacoes', n_ok, 'recusas', n_nao, 'socios', n_socios, 'roadmap_item_id', v_item);
end $$;
revoke all on function admin_rf98.ideia_decidir(uuid, text) from public, anon;
grant execute on function admin_rf98.ideia_decidir(uuid, text) to authenticated;
notify pgrst, 'reload schema';

-- o painel lê os votos públicos (contagem no kanban interno, inclusive de itens ocultos)
drop policy if exists roadmap_votos_admin_sel on elifoot_v3.roadmap_votos;
create policy roadmap_votos_admin_sel on elifoot_v3.roadmap_votos for select to authenticated using (admin_rf98.is_admin());
