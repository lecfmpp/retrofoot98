-- ===== APAGAR CONTATO DO MEDIA KIT (27/09/2026) =====
-- O painel (Publicidade → Contatos do media kit) apaga por esta função, e não por DELETE direto:
-- numa operação só ela confere a permissão, grava no Registro de ações (admin_rf98.adm_audit)
-- quem apagou com uma CÓPIA do contato inteiro no detalhe, e só então apaga. Não existe caminho
-- que apague sem deixar registro — e o contato pode ser refeito a partir da cópia.
-- Permissão = a mesma de editar Publicidade no painel (podeEditar): sócio ou financeiro, ativo.
-- A tabela continua SEM política de DELETE: ninguém apaga direto pela API.

create or replace function admin_rf98.media_kit_apagar(p_id uuid)
returns void language plpgsql security definer set search_path = admin_rf98, public as $$
declare v_row elifoot_v3.retrofoot_media_kit; v_email text;
begin
  if not exists (select 1 from admin_rf98.adm_users u
                  where u.user_id = auth.uid() and u.estado = 'ativo' and u.papel in ('socio','financeiro')) then
    raise exception 'Só sócio ou financeiro pode apagar contatos do media kit' using errcode = '42501';
  end if;
  select * into v_row from elifoot_v3.retrofoot_media_kit where id = p_id for update;
  if not found then raise exception 'Contato não encontrado (já foi apagado?)'; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into admin_rf98.adm_audit (quem, quem_email, acao, alvo, detalhe)
  values (auth.uid(), v_email, 'mediakit.apagar',
          coalesce(nullif(v_row.empresa,''), v_row.nome) || ' <' || v_row.email || '>',
          to_jsonb(v_row));
  delete from elifoot_v3.retrofoot_media_kit where id = p_id;
end $$;
revoke all on function admin_rf98.media_kit_apagar(uuid) from public, anon;
grant execute on function admin_rf98.media_kit_apagar(uuid) to authenticated;
notify pgrst, 'reload schema';
