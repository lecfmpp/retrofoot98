-- ===== DEPOIMENTOS DO PAYWALL NO PAINEL (27/09/2026) =====
-- A aba de opinião saiu do jogo; o que chega agora são os depoimentos (1ª trava do paywall) e os posts
-- (2ª trava), em elifoot_v3.temporadas_extras. A aba "Opiniões" do Roadmap no painel virou
-- "Depoimentos" e lê daqui. temporadas_extras não tem política para o painel, então a leitura é por
-- função (só admin), já com nome/e-mail de quem mandou e se é conta de sócio.
-- A triagem (lido, arquivado, virou ideia/bug) mora à parte, em admin_rf98.depoimento_triagem —
-- a tabela do jogo não é tocada.

create table if not exists admin_rf98.depoimento_triagem (
  extra_id   bigint primary key references elifoot_v3.temporadas_extras(id) on delete cascade,
  lida       boolean not null default false,
  arquivado  boolean not null default false,
  feature_id uuid references admin_rf98.adm_features(id) on delete set null,
  em         timestamptz not null default now()
);
alter table admin_rf98.depoimento_triagem enable row level security;
drop policy if exists depoimento_triagem_admin on admin_rf98.depoimento_triagem;
create policy depoimento_triagem_admin on admin_rf98.depoimento_triagem for all to authenticated
  using (admin_rf98.is_admin()) with check (admin_rf98.is_admin());
-- admin_rf98 não herda grant (ver memória): sem isto, "permission denied"
grant select, insert, update, delete on admin_rf98.depoimento_triagem to authenticated;

create or replace function admin_rf98.depoimentos()
returns jsonb language plpgsql stable security definer set search_path = admin_rf98, public as $$
declare v jsonb;
begin
  perform admin_rf98.exigir_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', te.id, 'tipo', te.tipo, 'texto', te.texto, 'link', te.link, 'resumo', te.resumo,
      'save_name', te.save_name, 'criado_em', te.criado_em, 'user_id', te.user_id,
      'nome', coalesce(nullif(u.raw_user_meta_data->>'name',''), nullif(u.raw_user_meta_data->>'nome',''), split_part(u.email,'@',1)),
      'email', u.email,
      'socio', exists (select 1 from admin_rf98.adm_users a where a.user_id = te.user_id and a.papel = 'socio'),
      'lida', coalesce(t.lida, false), 'arquivado', coalesce(t.arquivado, false), 'feature_id', t.feature_id
    ) order by te.criado_em desc), '[]'::jsonb) into v
  from elifoot_v3.temporadas_extras te
  left join auth.users u on u.id = te.user_id
  left join admin_rf98.depoimento_triagem t on t.extra_id = te.id
  where te.tipo in ('depoimento','post');
  return v;
end $$;
revoke all on function admin_rf98.depoimentos() from public, anon;
grant execute on function admin_rf98.depoimentos() to authenticated;
notify pgrst, 'reload schema';
