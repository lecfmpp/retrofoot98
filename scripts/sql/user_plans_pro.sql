-- ============================================================
-- PLANO DO TREINADOR (free / pro) — RetroFoot98
-- Aplicado em 2026-08-16. Copia versionada da migracao que ja esta no banco
-- (elifoot_v3_user_plans_pro), para o schema nao viver so no Supabase.
--
-- POR QUE UMA TABELA NOVA e nao `public.profiles`: aquela e do INVESTBOLA, o
-- outro produto que partilha este projeto Supabase. O RetroFoot nao tem tabela
-- de utilizadores propria — le auth.users direto —, entao o plano vive aqui, em
-- elifoot_v3, sem tocar em nada do outro produto.
--
-- COMO CONCEDER PRO (pelo SQL editor ou por um webhook com service_role):
--   insert into elifoot_v3.user_plans (user_id, plan, source, until)
--   values ('<uuid>', 'pro', 'stripe', now() + interval '1 year')
--   on conflict (user_id) do update
--     set plan=excluded.plan, source=excluded.source,
--         until=excluded.until, updated_at=now();
--
-- COMO TIRAR: update ... set plan='free'  (ou pôr `until` no passado, que
-- caduca sozinho — is_pro() ja respeita o prazo).
-- ============================================================

create table if not exists elifoot_v3.user_plans (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan       text        not null default 'free' check (plan in ('free','pro')),
  until      timestamptz,                 -- NULL = sem prazo
  source     text        not null default 'manual',
  note       text,
  since      timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function elifoot_v3.is_pro(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from elifoot_v3.user_plans up
    where up.user_id = p_user and up.plan = 'pro'
      and (up.until is null or up.until > now())
  );
$$;

create or replace function elifoot_v3.my_plan()
returns table (plan text, pro boolean, until timestamptz)
language sql stable security definer set search_path to '' as $$
  select coalesce(up.plan,'free'), elifoot_v3.is_pro(auth.uid()), up.until
  from (select auth.uid() as uid) me
  left join elifoot_v3.user_plans up on up.user_id = me.uid;
$$;

alter table elifoot_v3.user_plans enable row level security;

-- ler: so a propria linha. escrever: ninguem pelo cliente — conceder PRO e
-- decisao de servidor, senao qualquer pessoa se promovia do navegador.
drop policy if exists user_plans_ler_o_meu on elifoot_v3.user_plans;
create policy user_plans_ler_o_meu on elifoot_v3.user_plans
  for select using (user_id = auth.uid());

grant usage on schema elifoot_v3 to authenticated;
grant select on elifoot_v3.user_plans to authenticated;
grant execute on function elifoot_v3.my_plan() to authenticated;
grant execute on function elifoot_v3.is_pro(uuid) to authenticated;
