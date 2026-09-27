-- ===== QUEM ENTROU NO GRUPO DO WHATSAPP, E POR QUAL BOTÃO (27/09/2026) =====
-- Os botões do grupo (public/src/ui/rf26-grupo-wpp.js) levam PARA o WhatsApp, então UTM não serve.
-- O clique é guardado no navegador e o jogo manda para cá assim que houver conta logada
-- (NET.grupoWpp em net/supabase-adapter.js): na hora, se já está logado; no login/cadastro
-- seguinte, se clicou na home antes de ter conta.
-- botão: 'publica' (home e páginas do site), 'logada' (barra lateral / lingueta da área logada),
--        'modal' (janela logo depois do cadastro).
-- Uma linha por conta: o primeiro botão fica para sempre; o último e o total de cliques acompanham.
-- O painel lê em admin_rf98.usuarios (patch por replace no fim deste ficheiro).

create table if not exists elifoot_v3.user_grupo_wpp (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  primeiro_botao text not null,
  primeiro_em    timestamptz not null,
  ultimo_botao   text not null,
  ultimo_em      timestamptz not null,
  cliques        int not null default 1
);
alter table elifoot_v3.user_grupo_wpp enable row level security;   -- só pela função abaixo

create or replace function elifoot_v3.rf_grupo_wpp(p_botao text, p_em timestamptz default null)
returns void language plpgsql security definer set search_path = elifoot_v3, public as $$
declare v_em timestamptz;
begin
  if auth.uid() is null or p_botao not in ('publica','logada','modal') then return; end if;
  -- hora do clique vem do navegador (pode ter sido antes do cadastro): nunca no futuro, nunca absurda
  v_em := least(coalesce(p_em, now()), now());
  if v_em < now() - interval '180 days' then v_em := now(); end if;
  insert into elifoot_v3.user_grupo_wpp as g (user_id, primeiro_botao, primeiro_em, ultimo_botao, ultimo_em)
  values (auth.uid(), p_botao, v_em, p_botao, v_em)
  on conflict (user_id) do update set
    ultimo_botao = excluded.ultimo_botao,
    ultimo_em    = greatest(g.ultimo_em, excluded.ultimo_em),
    cliques      = g.cliques + 1;
end $$;
revoke all on function elifoot_v3.rf_grupo_wpp(text, timestamptz) from public, anon;
grant execute on function elifoot_v3.rf_grupo_wpp(text, timestamptz) to authenticated;

do $patch$
declare d text; n text;
begin
  select pg_get_functiondef('admin_rf98.usuarios(text,integer)'::regprocedure) into d;
  if position('user_grupo_wpp' in d) > 0 then raise notice 'usuarios já tem o grupo — nada a fazer'; return; end if;
  n := replace(d,
    $a$'canal_1', admin_rf98.origem_canal(b.origem->'primeiro')) j,$a$,
    $a$'canal_1', admin_rf98.origem_canal(b.origem->'primeiro'),
      'grupo_botao', gw.primeiro_botao, 'grupo_em', gw.primeiro_em,
      'grupo_ultimo_botao', gw.ultimo_botao, 'grupo_ultimo_em', gw.ultimo_em, 'grupo_cliques', gw.cliques) j,$a$);
  n := replace(n,
    $a$left join elifoot_v3.user_interacao ui on ui.user_id = b.id$a$,
    $a$left join elifoot_v3.user_interacao ui on ui.user_id = b.id
    left join elifoot_v3.user_grupo_wpp gw on gw.user_id = b.id$a$);
  if position('gw.primeiro_botao' in n) = 0 or position('user_grupo_wpp gw' in n) = 0 then
    raise exception 'patch do grupo não encaixou em admin_rf98.usuarios — rodar antes origem_cadastro.sql e conferir';
  end if;
  execute n;
end $patch$;
