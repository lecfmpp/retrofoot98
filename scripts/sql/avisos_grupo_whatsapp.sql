-- AVISOS NO GRUPO DOS DEVS (WhatsApp, Green-API) — 25/09/2026
-- Cadastro novo, contato do media kit e eventos de pagamento do Stripe viram mensagem no grupo
-- interno "PB Games" (o mesmo do vigia do Supabase). NUNCA o grupo público do jogo.
--
-- UM CAMINHO SÓ: quem quer avisar insere uma linha em admin_rf98.avisos_grupo (direto ou por
-- admin_rf98.avisar_grupo). O gatilho da tabela manda a mensagem pelo pg_net. A `chave` é única:
-- o Stripe reenvia eventos e o mesmo Pix chega por dois eventos — a segunda linha nem entra.
-- A tabela fica como registro do que foi enviado (pedido_id do pg_net, ou o erro).
--
-- CREDENCIAIS no Vault (green_api_url, green_api_id, green_api_token, whatsapp_grupo), gravadas
-- pelo workflow .github/workflows/configurar-avisos.yml a partir dos secrets do GitHub.
-- Sem elas, o aviso fica na tabela com erro = 'sem credenciais' e nada quebra.
--
-- NADA DISTO PODE IMPEDIR UM CADASTRO, UM CONTATO OU UM PAGAMENTO: toda chamada está protegida
-- por exception, e o envio em si é assíncrono (pg_net).

create table if not exists admin_rf98.avisos_grupo (
  id        bigserial primary key,
  chave     text unique,
  tipo      text not null,
  texto     text not null,
  criado_em timestamptz not null default now(),
  pedido_id bigint,
  erro      text
);
alter table admin_rf98.avisos_grupo enable row level security;   -- sem policies: só service role e funções

create or replace function admin_rf98.avisos_grupo_enviar() returns trigger
language plpgsql security definer set search_path = admin_rf98, public as $$
declare u text; i text; t text; g text; rid bigint;
begin
  select max(decrypted_secret) filter (where name = 'green_api_url'),
         max(decrypted_secret) filter (where name = 'green_api_id'),
         max(decrypted_secret) filter (where name = 'green_api_token'),
         max(decrypted_secret) filter (where name = 'whatsapp_grupo')
    into u, i, t, g
    from vault.decrypted_secrets
   where name in ('green_api_url', 'green_api_id', 'green_api_token', 'whatsapp_grupo');
  if u is null or i is null or t is null or g is null then
    update admin_rf98.avisos_grupo set erro = 'sem credenciais no vault' where id = new.id;
    return null;
  end if;
  select net.http_post(
           url     := rtrim(u, '/') || '/waInstance' || i || '/sendMessage/' || t,
           body    := jsonb_build_object('chatId', g, 'message', new.texto),
           headers := '{"Content-Type":"application/json"}'::jsonb)
    into rid;
  update admin_rf98.avisos_grupo set pedido_id = rid where id = new.id;
  return null;
exception when others then
  begin update admin_rf98.avisos_grupo set erro = left(sqlerrm, 300) where id = new.id;
  exception when others then null; end;
  return null;
end $$;

drop trigger if exists avisos_grupo_enviar on admin_rf98.avisos_grupo;
create trigger avisos_grupo_enviar after insert on admin_rf98.avisos_grupo
  for each row execute function admin_rf98.avisos_grupo_enviar();

/* porta para o stripe-webhook (service role) e para os gatilhos abaixo */
create or replace function admin_rf98.avisar_grupo(p_tipo text, p_texto text, p_chave text default null)
returns void language plpgsql security definer set search_path = admin_rf98, public as $$
begin
  insert into admin_rf98.avisos_grupo (chave, tipo, texto)
  values (p_chave, p_tipo, left(p_texto, 3500))
  on conflict (chave) do nothing;
end $$;
revoke all on function admin_rf98.avisar_grupo(text, text, text) from public, anon, authenticated;
grant execute on function admin_rf98.avisar_grupo(text, text, text) to service_role;

/* telefone legível: +55 (21) 99999-9999 para Brasil, +<dígitos> para o resto */
create or replace function admin_rf98.fone_legivel(p text) returns text
language sql immutable as $$
  select case
    when p is null or regexp_replace(p, '\D', '', 'g') = '' then '—'
    when regexp_replace(p, '\D', '', 'g') ~ '^55\d{10,11}$' then
      '+55 (' || substr(regexp_replace(p, '\D', '', 'g'), 3, 2) || ') ' ||
      substr(regexp_replace(p, '\D', '', 'g'), 5, length(regexp_replace(p, '\D', '', 'g')) - 8) || '-' ||
      right(regexp_replace(p, '\D', '', 'g'), 4)
    else '+' || regexp_replace(p, '\D', '', 'g') end
$$;

/* ---- CADASTRO NOVO ---- */
create or replace function admin_rf98.aviso_cadastro() returns trigger
language plpgsql security definer set search_path = admin_rf98, public as $$
begin
  begin
    perform admin_rf98.avisar_grupo('cadastro',
      '🆕 Novo cadastro no RetroFoot' || chr(10) ||
      'Nome: '     || coalesce(nullif(new.raw_user_meta_data->>'name', ''), nullif(new.raw_user_meta_data->>'nome', ''), '—') || chr(10) ||
      'E-mail: '   || coalesce(new.email, '—') || chr(10) ||
      'WhatsApp: ' || admin_rf98.fone_legivel(new.raw_user_meta_data->>'whatsapp'),
      'cadastro:' || new.id);
  exception when others then null; end;
  return new;
end $$;
drop trigger if exists aviso_cadastro on auth.users;
create trigger aviso_cadastro after insert on auth.users
  for each row execute function admin_rf98.aviso_cadastro();

/* ---- CONTATO DO MEDIA KIT ---- */
create or replace function admin_rf98.aviso_media_kit() returns trigger
language plpgsql security definer set search_path = admin_rf98, public as $$
begin
  begin
    perform admin_rf98.avisar_grupo('media_kit',
      '📣 Novo contato no media kit' || chr(10) ||
      'Empresa: '  || coalesce(nullif(new.empresa, ''), '—') || chr(10) ||
      'Nome: '     || coalesce(nullif(new.nome, ''), '—') || chr(10) ||
      'E-mail: '   || coalesce(nullif(new.email, ''), '—') || chr(10) ||
      'Telefone: ' || admin_rf98.fone_legivel(new.telefone) || chr(10) ||
      'Formato: '  || coalesce(nullif(new.objetivo, ''), '—') || chr(10) ||
      'Verba: '    || coalesce(nullif(new.verba, ''), '—') ||
      case when coalesce(new.observacao, '') <> '' then chr(10) || 'Mensagem: ' || new.observacao else '' end,
      'media_kit:' || new.id);
  exception when others then null; end;
  return new;
end $$;
drop trigger if exists aviso_media_kit on elifoot_v3.retrofoot_media_kit;
create trigger aviso_media_kit after insert on elifoot_v3.retrofoot_media_kit
  for each row execute function admin_rf98.aviso_media_kit();
