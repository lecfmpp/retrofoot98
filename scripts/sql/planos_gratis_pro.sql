-- GRÁTIS × PRO — 25/09/2026 (plano em docs/plano-gratis-pro.md)
--
-- Só dois planos: Grátis (1 carreira, 1 temporada por carreira) e Pro (ilimitado, Modo Resenha).
-- `resenha` e `embaixador` deixam de ser vendidos e são lidos como Pro.
--
-- TUDO NASCE DESLIGADO. Enquanto elifoot_v3.planos_config('gratis_pro').ligado = false, as regras
-- antigas continuam valendo (3 carreiras/mês, 7 dias de Resenha, temporadas livres). Ligar é
-- `select elifoot_v3.planos_lancar();` — SÓ depois que o jogo com o paywall estiver publicado, senão
-- o save de quem vira a temporada é recusado sem nenhuma tela explicando.
--
-- CONTAGEM DE TEMPORADAS: `temporadas_fechadas` (= len(S.history)) já sobe quando a última rodada
-- acaba (endSeason), ANTES da virada. Então a trava conta temporadas INICIADAS: len(history), mais 1
-- se a temporada atual ainda não está no histórico. Fim da 1ª = 1; depois da virada = 2.
--
-- TETO por carreira = 1 + soma de temporadas_extras (veterano / depoimento / post).
-- A trava só impede AVANÇAR além do teto: gravar a temporada em curso nunca é recusado, nem para
-- quem desceu do Pro com uma carreira longa.

-- 1) chave de liga/desliga ---------------------------------------------------------------------
create table if not exists elifoot_v3.planos_config (
  chave  text primary key,
  ligado boolean not null default false,
  ligado_em timestamptz
);
alter table elifoot_v3.planos_config enable row level security;   -- sem policies
insert into elifoot_v3.planos_config (chave, ligado) values ('gratis_pro', false)
  on conflict (chave) do nothing;

create or replace function elifoot_v3.gratis_pro_ligado() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select c.ligado from elifoot_v3.planos_config c where c.chave = 'gratis_pro'), false);
$$;

-- 2) plano `pro` no banco ----------------------------------------------------------------------
alter table elifoot_v3.user_plans drop constraint if exists user_plans_plan_check;
alter table elifoot_v3.user_plans add constraint user_plans_plan_check
  check (plan in ('free', 'resenha', 'embaixador', 'pro'));

-- 3) limites (mesma assinatura: my_plan, is_pro e os RPCs da Resenha dependem dela) ------------
create or replace function elifoot_v3.plano_limites(p_user uuid default auth.uid())
returns table(plan text, saves_max integer, pode_hospedar boolean, sala_max integer, avatar_ia boolean,
              pode_resenha boolean, resenha_ate timestamp with time zone)
language sql stable security definer set search_path = '' as $$
  with atual as (
    select coalesce(
      (select case when up.until is not null and up.until <= now() then 'free' else up.plan end
         from elifoot_v3.user_plans up where up.user_id = p_user),
      'free') as p,
      (select u.created_at from auth.users u where u.id = p_user) as nasceu,
      elifoot_v3.gratis_pro_ligado() as novo
  )
  select a.p,
         (case when a.novo then (case when a.p = 'free' then 1 else null end)
               else (case a.p when 'embaixador' then null when 'resenha' then 10 when 'pro' then null else 3 end)
          end)::int,
         (case when a.novo then a.p <> 'free' else a.p in ('embaixador', 'pro') end),
         (case when a.novo then (case when a.p <> 'free' then 10 else 0 end)
               else (case when a.p in ('embaixador', 'pro') then 10 else 0 end) end)::int,
         -- avatar IA virou item avulso: o Pro NÃO traz; quem é Embaixador continua com ele
         (a.p = 'embaixador'),
         (case when a.novo then a.p <> 'free'
               else (a.p <> 'free' or (a.nasceu is not null and now() < a.nasceu + interval '7 days')) end),
         (case when a.novo or a.p <> 'free' then null else a.nasceu + interval '7 days' end)
  from atual a;
$$;

-- 4) temporadas extras por carreira ------------------------------------------------------------
create table if not exists elifoot_v3.temporadas_extras (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  save_name  text not null,
  tipo       text not null check (tipo in ('veterano', 'depoimento', 'post')),
  qtd        int  not null check (qtd between 1 and 50),
  texto      text,
  link       text,
  resumo     text,
  criado_em  timestamptz not null default now()
);
-- veterano: 1 por carreira. depoimento e post: 1 por CONTA (não se renova apagando o save)
create unique index if not exists temporadas_extras_veterano on elifoot_v3.temporadas_extras (user_id, save_name)
  where tipo = 'veterano';
create unique index if not exists temporadas_extras_por_conta on elifoot_v3.temporadas_extras (user_id, tipo)
  where tipo in ('depoimento', 'post');
alter table elifoot_v3.temporadas_extras enable row level security;
drop policy if exists temporadas_extras_ler on elifoot_v3.temporadas_extras;
create policy temporadas_extras_ler on elifoot_v3.temporadas_extras for select to authenticated
  using (user_id = auth.uid());
grant select on elifoot_v3.temporadas_extras to authenticated;

/* temporadas INICIADAS do save (ver cabeçalho). Serve para S inteiro e para o resumo comprimido
   (SZ_RESUMO_S traz season e history). */
create or replace function elifoot_v3.temporadas_iniciadas(p_state jsonb) returns int
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p_state->'S'->'history') = 'array' then
      jsonb_array_length(p_state->'S'->'history')
      + case when jsonb_array_length(p_state->'S'->'history') > 0
              and (p_state->'S'->'history'->-1->>'season') = (p_state->'S'->>'season')
             then 0 else 1 end
    else 1 end;
$$;

create or replace function elifoot_v3.temporadas_teto(p_user uuid, p_save text) returns int
language sql stable security definer set search_path = '' as $$
  select 1 + coalesce((select sum(e.qtd) from elifoot_v3.temporadas_extras e
                        where e.user_id = p_user
                          and (e.save_name = p_save or e.tipo in ('depoimento', 'post'))), 0)::int;
$$;

-- 5) travas no solo_saves ----------------------------------------------------------------------
/* carreira nova. Desligado: cota mensal antiga. Ligado: grátis só cria se não tiver carreira
   nenhuma (quem já tem mais de uma, de antes, fica com elas). */
create or replace function elifoot_v3.solo_saves_teto() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_teto int; v_usados int; v_ini timestamptz;
begin
  if exists (select 1 from elifoot_v3.solo_saves s
              where s.user_id = new.user_id and s.save_name = new.save_name) then
    return new;                                   -- gravacao, nao criacao
  end if;
  select l.saves_max into v_teto from elifoot_v3.plano_limites(new.user_id) l;
  if v_teto is null then
    insert into elifoot_v3.solo_save_criacoes (user_id, save_name) values (new.user_id, new.save_name);
    return new;
  end if;
  if elifoot_v3.gratis_pro_ligado() then
    select count(*) into v_usados from elifoot_v3.solo_saves s where s.user_id = new.user_id;
    if v_usados >= v_teto then
      raise exception 'PLANO_SAVES: o plano gratuito tem % carreira', v_teto;
    end if;
  else
    v_ini := coalesce(elifoot_v3.inicio_da_cota(new.user_id), elifoot_v3.inicio_do_mes_br());
    select count(*) into v_usados from elifoot_v3.solo_save_criacoes c
     where c.user_id = new.user_id and c.criado_em >= v_ini;
    if v_usados >= v_teto then
      raise exception 'PLANO_SAVES: o seu plano cria ate % jogos por mes, e voce ja criou % neste ciclo', v_teto, v_usados;
    end if;
  end if;
  insert into elifoot_v3.solo_save_criacoes (user_id, save_name) values (new.user_id, new.save_name);
  return new;
end $$;

/* virada de temporada. Só recusa quando o save AVANÇA para além do teto (e além do que já
   estava gravado). */
create or replace function elifoot_v3.solo_saves_temporadas() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_novo int; v_velho int; v_teto int;
begin
  if not elifoot_v3.gratis_pro_ligado() then return new; end if;
  if (select l.plan from elifoot_v3.plano_limites(new.user_id) l) <> 'free' then return new; end if;
  v_novo := elifoot_v3.temporadas_iniciadas(new.state);
  v_velho := case when tg_op = 'UPDATE' then elifoot_v3.temporadas_iniciadas(old.state) else 1 end;
  if v_novo <= v_velho then return new; end if;
  v_teto := elifoot_v3.temporadas_teto(new.user_id, new.save_name);
  if v_novo > v_teto then
    raise exception 'PLANO_TEMPORADAS: o plano gratuito libera % temporada(s) nesta carreira', v_teto;
  end if;
  return new;
end $$;

drop trigger if exists solo_saves_temporadas on elifoot_v3.solo_saves;
create trigger solo_saves_temporadas before insert or update of state on elifoot_v3.solo_saves
  for each row execute function elifoot_v3.solo_saves_temporadas();

-- 6) o que o jogo lê no fim da temporada ------------------------------------------------------
create or replace function elifoot_v3.rf_temporadas(p_save text)
returns table(ligado boolean, pro boolean, teto int, iniciadas int, restam int,
              veterano boolean, depoimento_usado boolean, post_usado boolean)
language sql stable security definer set search_path = '' as $$
  with base as (
    select elifoot_v3.gratis_pro_ligado() as lig,
           (select l.plan from elifoot_v3.plano_limites(auth.uid()) l) <> 'free' as pro,
           elifoot_v3.temporadas_teto(auth.uid(), p_save) as teto,
           coalesce((select elifoot_v3.temporadas_iniciadas(s.state) from elifoot_v3.solo_saves s
                      where s.user_id = auth.uid() and s.save_name = p_save), 1) as ini
  )
  select b.lig, b.pro, b.teto, b.ini, greatest(b.teto - b.ini, 0),
         exists (select 1 from elifoot_v3.temporadas_extras e where e.user_id = auth.uid()
                  and e.save_name = p_save and e.tipo = 'veterano'),
         exists (select 1 from elifoot_v3.temporadas_extras e where e.user_id = auth.uid() and e.tipo = 'depoimento'),
         exists (select 1 from elifoot_v3.temporadas_extras e where e.user_id = auth.uid() and e.tipo = 'post')
  from base b;
$$;
revoke all on function elifoot_v3.rf_temporadas(text) from public, anon;
grant execute on function elifoot_v3.rf_temporadas(text) to authenticated;

/* +1 temporada por depoimento (texto) ou por post/vídeo (link). Libera NA HORA (decisão do dono)
   e avisa o grupo dos devs. p_resumo vem do cliente ("Subiu para a Série C, 3º") e só vai para a
   mensagem. */
create or replace function elifoot_v3.rf_liberar_temporada(p_save text, p_tipo text, p_texto text default null,
                                                           p_link text default null, p_resumo text default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_nome text; v_email text; v_fone text; v_clube text; v_teto int; v_msg text;
begin
  if v_uid is null then raise exception 'SEM_LOGIN'; end if;
  if p_tipo not in ('depoimento', 'post') then raise exception 'TIPO_INVALIDO'; end if;
  if not elifoot_v3.gratis_pro_ligado()
     or (select l.plan from elifoot_v3.plano_limites(v_uid) l) <> 'free' then
    raise exception 'NAO_SE_APLICA';
  end if;
  if not exists (select 1 from elifoot_v3.solo_saves s where s.user_id = v_uid and s.save_name = p_save) then
    raise exception 'SAVE_INEXISTENTE';
  end if;
  if p_tipo = 'depoimento' and length(btrim(coalesce(p_texto, ''))) < 20 then
    raise exception 'DEPOIMENTO_CURTO';
  end if;
  if p_tipo = 'post' and coalesce(p_link, '') !~* '^https?://([a-z0-9-]+\.)*(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|fb\.watch|threads\.net|kwai\.com)/' then
    raise exception 'LINK_INVALIDO';
  end if;
  if exists (select 1 from elifoot_v3.temporadas_extras e where e.user_id = v_uid and e.tipo = p_tipo) then
    raise exception 'JA_USADO';
  end if;

  insert into elifoot_v3.temporadas_extras (user_id, save_name, tipo, qtd, texto, link, resumo)
  values (v_uid, p_save, p_tipo, 1, left(btrim(p_texto), 2000), left(btrim(p_link), 500), left(p_resumo, 200));
  v_teto := elifoot_v3.temporadas_teto(v_uid, p_save);

  -- aviso aos devs; nunca impede a liberação
  begin
    select coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
           u.email, admin_rf98.fone_legivel(u.raw_user_meta_data->>'whatsapp')
      into v_nome, v_email, v_fone
      from auth.users u where u.id = v_uid;
    select s.club_short into v_clube from elifoot_v3.solo_saves s where s.user_id = v_uid and s.save_name = p_save;
    v_msg := case when p_tipo = 'depoimento' then '💬 *Depoimento no RetroFoot*' else '📣 *Post/vídeo sobre o RetroFoot*' end
      || chr(10) || coalesce(v_nome, '?') || ' (' || coalesce(v_email, '?') || ' · ' || coalesce(v_fone, '—') || ')'
      || case when p_tipo = 'depoimento' then ' deixou depoimento' else ' publicou sobre o jogo' end
      || ' e estendeu a carreira' || coalesce(' no ' || v_clube, '') || ' por mais 1 temporada no modo gratuito.'
      || coalesce(chr(10) || 'Temporada: ' || p_resumo, '')
      || case when p_tipo = 'depoimento' then chr(10) || chr(10) || '"' || left(btrim(p_texto), 2000) || '"'
              else chr(10) || chr(10) || btrim(p_link) end;
    perform admin_rf98.avisar_grupo(p_tipo, v_msg, 'temporada:' || v_uid || ':' || p_tipo);
  exception when others then null;
  end;
  return v_teto;
end $$;
revoke all on function elifoot_v3.rf_liberar_temporada(text, text, text, text, text) from public, anon;
grant execute on function elifoot_v3.rf_liberar_temporada(text, text, text, text, text) to authenticated;

-- 7) lançar / desligar -------------------------------------------------------------------------
/* Veteranos = carreira de conta gratuita que, no lançamento, já terminou a 1ª temporada.
   Jogando a temporada k agora: joga k, k+1 e k+2; aviso do Beta no fim de k, paywall com saída
   no fim de k+1, bloqueio no fim de k+2. Teto = k+2 → qtd = k+1. Idempotente. */
create or replace function elifoot_v3.planos_lancar() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into elifoot_v3.temporadas_extras (user_id, save_name, tipo, qtd, resumo)
  select s.user_id, s.save_name, 'veterano', elifoot_v3.temporadas_iniciadas(s.state) + 1,
         'lançamento: jogando a temporada ' || elifoot_v3.temporadas_iniciadas(s.state)
    from elifoot_v3.solo_saves s
   where s.temporadas_fechadas >= 1
     and (select l.plan from elifoot_v3.plano_limites(s.user_id) l) = 'free'
  on conflict do nothing;
  get diagnostics n = row_count;
  update elifoot_v3.planos_config set ligado = true, ligado_em = now() where chave = 'gratis_pro';
  return n;
end $$;

create or replace function elifoot_v3.planos_desligar() returns void
language sql security definer set search_path = '' as $$
  update elifoot_v3.planos_config set ligado = false where chave = 'gratis_pro';
$$;
revoke all on function elifoot_v3.planos_lancar() from public, anon, authenticated;
revoke all on function elifoot_v3.planos_desligar() from public, anon, authenticated;
revoke all on function elifoot_v3.gratis_pro_ligado() from public, anon;
revoke all on function elifoot_v3.temporadas_teto(uuid, text) from public, anon, authenticated;
