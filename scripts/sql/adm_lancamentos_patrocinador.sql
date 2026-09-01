-- ============================================================
-- A RECEITA DE PATROCINIO SAI COM O PATROCINADOR
-- Aplicado em 2026-09-01.
--
-- Criar um patrocinador com "lancar como receita" inseria uma linha em
-- adm_lancamentos (categoria publicidade, recorrencia MENSAL). Apagar o
-- patrocinador apagava so' a linha de adm_patrocinadores -- o lancamento ficava,
-- e como e' recorrente a pagina de Financas continuava a materializar os meses e
-- a somar a receita de uma marca que ja' nao existe.
--
-- Encontrado no ar: "Patrocinio — Adidas", R$ 9.000,00/mes, sem patrocinador por
-- tras. Removido (id 666843e3-3cb2-455b-b91c-efe53c62b112).
--
-- QUEM APAGA A RECEITA E' O BANCO, e nao uma segunda chamada do painel: ON DELETE
-- CASCADE nao pode falhar sozinho nem ser esquecido no proximo caminho de apagar
-- que alguem escrever.
-- ============================================================

alter table admin_rf98.adm_lancamentos
  add column if not exists patrocinador_id uuid
  references admin_rf98.adm_patrocinadores(id) on delete cascade;

comment on column admin_rf98.adm_lancamentos.patrocinador_id is
 'Lançamento gerado a partir de um patrocinador. ON DELETE CASCADE: apagar o patrocinador leva a receita junto — antes ela ficava a somar para sempre.';

-- casa as linhas antigas pelo texto que o painel escreve ao criar
update admin_rf98.adm_lancamentos l
   set patrocinador_id = p.id
  from admin_rf98.adm_patrocinadores p
 where l.patrocinador_id is null
   and l.categoria = 'publicidade'
   and l.descricao = 'Patrocínio — ' || p.nome;
