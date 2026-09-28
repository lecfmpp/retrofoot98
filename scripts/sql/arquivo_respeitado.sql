-- ===== ARQUIVAR É DE VERDADE (27/09/2026) =====
-- O dono arquivava e as ideias "voltavam". Três causas, corrigidas aqui:
--  1) roadmap_operacional.sql mudou para 'pendente' as arquivadas que viraram marketing/operação (erro).
--  2) ideia_decidir tratava voto em ideia arquivada como "volta para a fila": outro sócio, com a
--     página aberta de antes, votava e desarquivava (22:19:22 arquivada → 22:19:38 voto → pendente).
--     Agora voto em arquivada é RECUSADO com aviso; para votar, reabrir antes (ideia_reabrir).
--  3) as abas Bugs e Marketing e operação não olhavam o arquivamento (corrigido no painel).
-- Reparo: volta para 'arquivada' toda ideia cujo último gesto de arquivo no Registro foi "arquivar"
-- (não "reabrir"/"desarquivar") e que hoje não está arquivada nem aprovada.

create or replace function admin_rf98.ideia_nao_votar_arquivada() returns trigger language plpgsql as $$
begin
  if exists (select 1 from admin_rf98.adm_features where id = new.ideia_id and ideia_status = 'arquivada') then
    raise exception 'Esta ideia foi arquivada — atualize a página. Para votar nela, reabra a votação antes.';
  end if;
  return new;
end $$;
drop trigger if exists ideia_nao_votar_arquivada on admin_rf98.ideia_votos;
create trigger ideia_nao_votar_arquivada before insert or update on admin_rf98.ideia_votos
  for each row execute function admin_rf98.ideia_nao_votar_arquivada();

with ult as (
  select distinct on (coalesce(a.detalhe->>'ideia_id','')) a.detalhe->>'ideia_id' ideia_id, a.acao
    from admin_rf98.adm_audit a
   where a.acao in ('ideia.arquivar','ideia.desarquivar','ideia.reabrir') and a.detalhe ? 'ideia_id'
   order by coalesce(a.detalhe->>'ideia_id',''), a.quando desc)
update admin_rf98.adm_features f set ideia_status = 'arquivada'
  from ult where ult.ideia_id = f.id::text and ult.acao = 'ideia.arquivar'
   and f.ideia_status not in ('arquivada','aprovada');
