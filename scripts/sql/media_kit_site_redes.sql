-- ===== MEDIA KIT: SITE E REDES SOCIAIS (27/09/2026) =====
-- O formulário de /media-kit/ (seo/media-kit.mjs) passou a pedir, obrigatórios, o site e a rede
-- social (da empresa ou pessoal) — o comercial quer olhar a marca antes de responder.
-- A obrigatoriedade fica no formulário, não no banco: o formulário antigo da landing
-- (clMediaKitEnviar em ui/main.js) não tem esses campos, e a RLS recusaria o insert dele.
-- O aviso do grupo (admin_rf98.aviso_media_kit, ver avisos_grupo_whatsapp.sql) passa a mostrar os dois.

alter table elifoot_v3.retrofoot_media_kit add column if not exists site  text;
alter table elifoot_v3.retrofoot_media_kit add column if not exists redes text;

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
      'Site: '     || coalesce(nullif(new.site, ''), '—') || chr(10) ||
      'Redes: '    || coalesce(nullif(new.redes, ''), '—') || chr(10) ||
      'Formato: '  || coalesce(nullif(new.objetivo, ''), '—') || chr(10) ||
      'Verba: '    || coalesce(nullif(new.verba, ''), '—') ||
      case when coalesce(new.observacao, '') <> '' then chr(10) || 'Mensagem: ' || new.observacao else '' end,
      'media_kit:' || new.id);
  exception when others then null; end;
  return new;
end $$;
notify pgrst, 'reload schema';
