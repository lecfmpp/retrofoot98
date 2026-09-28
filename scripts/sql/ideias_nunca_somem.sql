-- ===== IDEIA NUNCA SOME (27/09/2026) =====
-- Pedido do dono: mesmo recusada, a ideia fica — pode entrar no roadmap em outro momento.
--   · 'recusada' passa a ser "por enquanto": admin_rf98.ideia_reabrir zera os votos e volta a ideia para
--     'pendente' (também para arquivada, e para aprovada cujo item foi tirado do roadmap).
--   · o painel não apaga ideia: sem DELETE para authenticated em adm_features (arquivar é o caminho).

create or replace function admin_rf98.ideia_reabrir(p_ideia uuid)
returns void language plpgsql security definer set search_path = admin_rf98, public as $$
declare v_f admin_rf98.adm_features; v_email text;
begin
  if not admin_rf98.is_socio() then raise exception 'Só sócio reabre a votação' using errcode = '42501'; end if;
  select * into v_f from admin_rf98.adm_features where id = p_ideia for update;
  if not found then raise exception 'Ideia não encontrada'; end if;
  if v_f.ideia_status = 'aprovada' and v_f.roadmap_item_id is not null
     and exists (select 1 from elifoot_v3.roadmap_itens where id = v_f.roadmap_item_id) then
    raise exception 'Esta ideia está no roadmap — tire o item do roadmap antes';
  end if;
  delete from admin_rf98.ideia_votos where ideia_id = p_ideia;
  update admin_rf98.adm_features set ideia_status = 'pendente', decidida_em = null, roadmap_item_id = null where id = p_ideia;
  select email into v_email from auth.users where id = auth.uid();
  insert into admin_rf98.adm_audit (quem, quem_email, acao, alvo, detalhe)
  values (auth.uid(), v_email, 'ideia.reabrir', v_f.titulo, jsonb_build_object('ideia_id', p_ideia, 'estava', v_f.ideia_status));
end $$;
revoke all on function admin_rf98.ideia_reabrir(uuid) from public, anon;
grant execute on function admin_rf98.ideia_reabrir(uuid) to authenticated;

revoke delete on admin_rf98.adm_features from authenticated, anon;
notify pgrst, 'reload schema';
