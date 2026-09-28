-- ===== ROADMAP PÚBLICO — /roadmap/ (27/09/2026) =====
-- A página pública (seo/roadmap.mjs) mostra o que vem na Versão 2 num quadro kanban, com votos.
-- É SEPARADO do kanban interno do painel (admin_rf98.adm_features): aquele mistura tarefa de
-- operação ("textos no Drive", "e-mails da lista de espera") e não pode ir a público.
--
--   roadmap_itens  — o que aparece. status: analise | planejado | desenvolvimento | lancado.
--                    versao: v2 | v1_extra (pode chegar ainda na V1, conforme complexidade).
--   roadmap_votos  — 1 voto por conta por item (chave item+usuário). Votar de novo tira o voto.
--
-- Leitura e voto SÓ por função (as tabelas não têm política aberta):
--   rf_roadmap()             — anon e logado: itens publicados + votos (+ meu_voto se logado)
--   rf_roadmap_votar(item)   — só logado: liga/desliga o voto e devolve a contagem nova
-- Os votos dos sócios contam como os de qualquer conta (é voto de gosto, não métrica de negócio).

create table if not exists elifoot_v3.roadmap_itens (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  descricao  text,
  area       text,
  status     text not null default 'analise' check (status in ('analise','planejado','desenvolvimento','lancado')),
  versao     text not null default 'v2' check (versao in ('v2','v1_extra')),
  ord        int  not null default 0,
  publicado  boolean not null default true,
  lancado_em date,
  criado_em  timestamptz not null default now()
);
create table if not exists elifoot_v3.roadmap_votos (
  item_id   uuid not null references elifoot_v3.roadmap_itens(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (item_id, user_id)
);
alter table elifoot_v3.roadmap_itens enable row level security;
alter table elifoot_v3.roadmap_votos enable row level security;
-- o painel lê e edita os itens direto (sócio/produto); o público só pelas funções abaixo
drop policy if exists roadmap_itens_admin on elifoot_v3.roadmap_itens;
create policy roadmap_itens_admin on elifoot_v3.roadmap_itens for all to authenticated
  using (admin_rf98.is_admin()) with check (admin_rf98.is_admin());

create or replace function elifoot_v3.rf_roadmap()
returns jsonb language sql stable security definer set search_path = elifoot_v3, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'titulo', i.titulo, 'descricao', i.descricao, 'area', i.area,
      'status', i.status, 'versao', i.versao, 'ord', i.ord, 'lancado_em', i.lancado_em,
      'votos', (select count(*) from elifoot_v3.roadmap_votos v where v.item_id = i.id),
      'meu_voto', auth.uid() is not null and exists (select 1 from elifoot_v3.roadmap_votos v
                                                      where v.item_id = i.id and v.user_id = auth.uid()))
    order by i.ord, i.criado_em), '[]'::jsonb)
  from elifoot_v3.roadmap_itens i where i.publicado
$$;
revoke all on function elifoot_v3.rf_roadmap() from public;
grant execute on function elifoot_v3.rf_roadmap() to anon, authenticated;

create or replace function elifoot_v3.rf_roadmap_votar(p_item uuid)
returns jsonb language plpgsql security definer set search_path = elifoot_v3, public as $$
declare v_votou boolean;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para votar' using errcode = '28000'; end if;
  if not exists (select 1 from elifoot_v3.roadmap_itens where id = p_item and publicado and status <> 'lancado') then
    raise exception 'Item não encontrado ou já lançado';
  end if;
  delete from elifoot_v3.roadmap_votos where item_id = p_item and user_id = auth.uid();
  if found then v_votou := false;
  else insert into elifoot_v3.roadmap_votos (item_id, user_id) values (p_item, auth.uid()); v_votou := true;
  end if;
  return jsonb_build_object('votou', v_votou,
    'votos', (select count(*) from elifoot_v3.roadmap_votos where item_id = p_item));
end $$;
revoke all on function elifoot_v3.rf_roadmap_votar(uuid) from public, anon;
grant execute on function elifoot_v3.rf_roadmap_votar(uuid) to authenticated;

-- (Havia aqui 13 itens iniciais. Em 27/09/2026 o dono mandou ZERAR o roadmap: tudo passa pelo banco de
--  ideias e pela aprovação dos sócios — ver roadmap_banco_ideias.sql. Não recriar itens por SQL.)
notify pgrst, 'reload schema';
