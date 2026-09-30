-- SEGUNDA TRAVA → MENSAGEM NO GRUPO DO WHATSAPP (30/09/2026)
-- Só troca a função rf_liberar_temporada (mesma assinatura, mesmas permissões):
--   1. o tipo 'post' passa a aceitar link do WhatsApp: o do grupo (chat.whatsapp.com — o botão
--      único do paywall copia a mensagem e abre o grupo) e, na reserva, o wa.me com o texto.
--      Os links de redes sociais continuam valendo (abas antigas abertas);
--   2. liberação por confiança, UMA VEZ POR CONTA: JA_USADO se já houver 'post' (inclusive o
--      post antigo nas redes — quem já usou essa vaga não ganha outra) e, se dois toques chegarem
--      juntos, o índice único temporadas_extras_por_conta vira JA_USADO em vez de erro genérico;
--   3. o aviso aos devs diz que a pessoa abriu o grupo e mostra a mensagem.
-- Não mexe em tabela nem em linha já gravada: quem já passou da trava continua como está.
-- Idempotente. Aplicar ANTES (ou junto) de publicar o site com o paywall novo: sem isto o
-- botão "Já mandei" responde LINK_INVALIDO. Fonte canônica: planos_gratis_pro.sql.

create or replace function elifoot_v3.rf_liberar_temporada(p_save text, p_tipo text, p_texto text default null,
                                                           p_link text default null, p_resumo text default null)
returns int
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_nome text; v_email text; v_fone text; v_clube text; v_teto int; v_msg text; v_wpp boolean;
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
  -- 30/09: a 2ª saída virou "mensagem no grupo do WhatsApp". O jogo manda o link do grupo
  -- (chat.whatsapp.com, o botão copia a mensagem e abre o grupo) ou, sem ele, o wa.me com o texto.
  -- Liberação por confiança (não há como saber se a mensagem foi enviada), uma vez por conta.
  -- Os links de redes sociais continuam aceitos para quem ainda estiver com a versão antiga aberta.
  if p_tipo = 'post' and coalesce(p_link, '') !~* '^https?://([a-z0-9-]+\.)*(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|fb\.watch|threads\.net|kwai\.com|wa\.me|whatsapp\.com)/' then
    raise exception 'LINK_INVALIDO';
  end if;
  if exists (select 1 from elifoot_v3.temporadas_extras e where e.user_id = v_uid and e.tipo = p_tipo) then
    raise exception 'JA_USADO';
  end if;

  begin
    insert into elifoot_v3.temporadas_extras (user_id, save_name, tipo, qtd, texto, link, resumo)
    values (v_uid, p_save, p_tipo, 1, left(btrim(p_texto), 2000), left(btrim(p_link), 500), left(p_resumo, 200));
  exception when unique_violation then
    -- dois toques ao mesmo tempo: o índice temporadas_extras_por_conta segura o 2º
    raise exception 'JA_USADO';
  end;
  v_teto := elifoot_v3.temporadas_teto(v_uid, p_save);

  -- aviso aos devs; nunca impede a liberação
  begin
    select coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
           u.email, admin_rf98.fone_legivel(u.raw_user_meta_data->>'whatsapp')
      into v_nome, v_email, v_fone
      from auth.users u where u.id = v_uid;
    select s.club_short into v_clube from elifoot_v3.solo_saves s where s.user_id = v_uid and s.save_name = p_save;
    v_wpp := p_tipo = 'post' and p_link ~* '^https?://([a-z0-9-]+\.)*(wa\.me|whatsapp\.com)/';
    v_msg := case when p_tipo = 'depoimento' then '💬 *Depoimento no RetroFoot*'
                  when v_wpp then '📲 *Mensagem no grupo do WhatsApp*'
                  else '📣 *Post/vídeo sobre o RetroFoot*' end
      || chr(10) || coalesce(v_nome, '?') || ' (' || coalesce(v_email, '?') || ' · ' || coalesce(v_fone, '—') || ')'
      || case when p_tipo = 'depoimento' then ' deixou depoimento'
              when v_wpp then ' abriu o grupo para contar a temporada'
              else ' publicou sobre o jogo' end
      || ' e estendeu a carreira' || coalesce(' no ' || v_clube, '') || ' por mais 1 temporada no Peladeiro.'
      || coalesce(chr(10) || 'Temporada: ' || p_resumo, '')
      || case when p_tipo = 'depoimento' or v_wpp then chr(10) || chr(10) || '"' || left(btrim(coalesce(p_texto, '')), 2000) || '"'
              else chr(10) || chr(10) || btrim(p_link) end;
    -- marca a equipe no grupo (lista no Vault: 'whatsapp_marcar', números separados por vírgula)
    select v_msg || coalesce(chr(10) || chr(10) || string_agg('@' || btrim(n), ' '), '')
      into v_msg
      from vault.decrypted_secrets d, unnest(string_to_array(d.decrypted_secret, ',')) n
     where d.name = 'whatsapp_marcar' and btrim(n) <> '';
    perform admin_rf98.avisar_grupo(p_tipo, v_msg, 'temporada:' || v_uid || ':' || p_tipo);
  exception when others then null;
  end;
  return v_teto;
end $$;
revoke all on function elifoot_v3.rf_liberar_temporada(text, text, text, text, text) from public, anon;
grant execute on function elifoot_v3.rf_liberar_temporada(text, text, text, text, text) to authenticated;
