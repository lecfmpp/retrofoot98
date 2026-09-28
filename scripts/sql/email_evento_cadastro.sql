-- ===== CADASTRO NOVO -> AUTOMAÇÃO DE ONBOARDING NO RESEND (28/09/2026) =====
-- Pedido do dono: "a sequência de dicas precisa ser uma automação pós-cadastro".
-- Automação no Resend: "RF · Onboarding pós-cadastro (boas-vindas + 7 Dicas do Presidente)"
--   (id 01a0e88d-8c1f-74ce-9d3c-fe9f64685edb), gatilho = evento rf.cadastro:
--   dia 0 boas-vindas · +1 Dica 1 · +1 Dica 2 · +2 Dica 3 · +2 Dica 4 · +3 Dica 5 · +3 Dica 6 · +3 Dica 7
--   (dias 0, 1, 2, 4, 6, 9, 12, 15). Os templates precisam estar PUBLICADOS no Resend.
-- Só cadastros NOVOS entram (trigger de insert); a base antiga não recebe a sequência.
-- Vai pela mesma fila do sync (admin_rf98.email_fila, 1 chamada a cada 2 s): primeiro cria o contato
-- com o primeiro nome (o {{{FIRST_NAME}}} dos e-mails), depois dispara o evento. Nunca pode derrubar
-- o cadastro: qualquer erro aqui é engolido.
create or replace function admin_rf98.email_evento_cadastro()
returns trigger language plpgsql security definer set search_path = admin_rf98, public as $$
declare v_email text := lower(new.email);
        v_nome text := nullif(split_part(trim(coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'nome', '')), ' ', 1), '');
begin
  if v_email is null or coalesce(new.is_anonymous, false) then return new; end if;
  begin
    insert into admin_rf98.email_fila (user_id, metodo, caminho, corpo) values
      (new.id, 'POST', '/contacts', jsonb_strip_nulls(jsonb_build_object('email', v_email, 'first_name', v_nome))),
      (new.id, 'POST', '/events/send', jsonb_build_object('event', 'rf.cadastro', 'email', v_email,
         'payload', jsonb_build_object('nome', coalesce(v_nome, ''), 'origem', coalesce(new.raw_user_meta_data->>'utm_source', ''))));
  exception when others then
    raise warning 'email_evento_cadastro: %', sqlerrm;
  end;
  return new;
end $$;
revoke all on function admin_rf98.email_evento_cadastro() from public, anon, authenticated;
drop trigger if exists email_evento_cadastro on auth.users;
create trigger email_evento_cadastro after insert on auth.users
  for each row execute function admin_rf98.email_evento_cadastro();
