-- "ATIVO" = LOGIN OU JOGADA, NÃO ABA ABERTA (25/09/2026)
-- A página de Usuários do painel marca Ativo (≤2 dias) / Parado / Perdido pelo `ultimo_acesso`,
-- que era greatest(último login, último save do Solo, last_seen da Resenha). O last_seen da
-- Resenha é carimbado a cada 15 s enquanto a sala está ABERTA — inclusive com a aba em segundo
-- plano —, então deixar a sala aberta contava como estar a jogar.
--
-- Agora há uma marca de INTERAÇÃO por conta: o jogo chama rf_interacao ao clicar em Jogar /
-- Pronto / Avançar dia (Solo e Resenha). Uma linha por conta, atualizada no lugar e no máximo
-- uma vez por minuto (pouco IO). O painel passa a usar greatest(login, save do Solo, interação);
-- o last_seen da Resenha só conta para quem ainda não tem marca nenhuma (transição sem saltos).

create table if not exists elifoot_v3.user_interacao (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ultima  timestamptz not null default now(),
  tipo    text
);
alter table elifoot_v3.user_interacao enable row level security;   -- sem policies: só pela RPC

create or replace function elifoot_v3.rf_interacao(p_tipo text default 'rodada')
returns void language plpgsql security definer set search_path = elifoot_v3, public as $$
begin
  if auth.uid() is null then return; end if;
  insert into elifoot_v3.user_interacao (user_id, ultima, tipo)
  values (auth.uid(), now(), left(coalesce(p_tipo, 'rodada'), 20))
  on conflict (user_id) do update set ultima = excluded.ultima, tipo = excluded.tipo
   where elifoot_v3.user_interacao.ultima < now() - interval '1 minute';
end $$;
revoke all on function elifoot_v3.rf_interacao(text) from public, anon;
grant execute on function elifoot_v3.rf_interacao(text) to authenticated;

-- admin_rf98.usuarios: troca o cálculo do último acesso sem reescrever a função à mão —
-- substitui os trechos exatos e FALHA se não os encontrar (nada muda nesse caso).
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('admin_rf98.usuarios'::regproc);
  if position('ui.ultima' in d) > 0 then return; end if;          -- já aplicado
  n := replace(d, 'greatest(b.last_sign_in_at, so.visto, re.visto)',
    'greatest(b.last_sign_in_at, so.visto, ui.ultima, case when ui.user_id is null then re.visto end)');
  if n = d then raise exception 'usuarios: cálculo de ultimo_acesso não encontrado'; end if;
  d := n;
  n := replace(d, '    left join tempo t on t.user_id = b.id',
    '    left join tempo t on t.user_id = b.id' || chr(10) ||
    '    left join elifoot_v3.user_interacao ui on ui.user_id = b.id');
  if n = d then raise exception 'usuarios: join de tempo não encontrado'; end if;
  execute n;
end $$;
