-- ===== BUGS SEPARADOS DOS RECURSOS (27/09/2026) =====
-- Pedido do dono: o jogador não vota em bug nem em "coisa a corrigir". Então adm_features ganha TIPO:
--   'recurso' — banco de ideias → aprovação dos sócios → roadmap público (roadmap_banco_ideias.sql)
--   'bug'     — aba Bugs do painel, fluxo próprio (aberto → corrigindo → corrigido | nao_e_bug).
--               NUNCA vai para o roadmap: ideia_decidir recusa bug.
-- Pré-classificação conservadora dos cards antigos: só títulos claramente de correção/verificação.
-- O resto fica 'recurso'; cada item tem botão para mudar de lado no painel.

alter table admin_rf98.adm_features add column if not exists tipo text not null default 'recurso';
alter table admin_rf98.adm_features drop constraint if exists adm_features_tipo_chk;
alter table admin_rf98.adm_features add constraint adm_features_tipo_chk check (tipo in ('recurso','bug'));
alter table admin_rf98.adm_features add column if not exists bug_status text not null default 'aberto';
alter table admin_rf98.adm_features drop constraint if exists adm_features_bug_status_chk;
alter table admin_rf98.adm_features add constraint adm_features_bug_status_chk
  check (bug_status in ('aberto','corrigindo','corrigido','nao_e_bug'));

-- pré-classificação: os que já estavam na etapa "Feito" entram como corrigidos
update admin_rf98.adm_features f set tipo = 'bug',
       bug_status = case when c.nome = 'Feito' then 'corrigido' else 'aberto' end
  from admin_rf98.adm_kanban_cols c
 where c.id = f.coluna_id and f.tipo = 'recurso' and f.ideia_status <> 'aprovada'
   and (f.titulo ilike 'Corrigir%' or f.titulo ilike 'Verificar%' or f.titulo ilike 'Ajustar -%'
        or f.titulo ilike 'Ajustar no %' or f.titulo ilike 'Email nao arquiva%');

-- bug não entra na votação do roadmap
create or replace function admin_rf98.ideia_nao_bug() returns trigger language plpgsql as $$
begin
  if exists (select 1 from admin_rf98.adm_features where id = new.ideia_id and tipo = 'bug') then
    raise exception 'Bug não vai para o roadmap — mude para recurso antes de votar';
  end if;
  return new;
end $$;
drop trigger if exists ideia_nao_bug on admin_rf98.ideia_votos;
create trigger ideia_nao_bug before insert or update on admin_rf98.ideia_votos
  for each row execute function admin_rf98.ideia_nao_bug();
