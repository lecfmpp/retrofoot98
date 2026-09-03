-- ============================================================================
-- adm_features ganha AUTORIA e CONTEÚDO
-- ----------------------------------------------------------------------------
-- O kanban de funcionalidades guardava título, nota de uma linha, origem, votos
-- e coluna. Não guardava QUEM criou o card nem tinha onde escrever mais do que
-- uma linha — quem quisesse colar um link, um print de conversa ou o contexto
-- de um pedido não tinha lugar, e o card virava um título solto que ninguém
-- sabia de onde veio.
--
-- `descricao` é o corpo do card: texto livre, com links. `nota` continua a ser
-- a linha curta que aparece no card fechado; a descrição só aparece ao abrir.
-- São coisas diferentes de propósito — o quadro tem de continuar legível de
-- relance, e um parágrafo dentro de cada card acabaria com isso.
--
-- `criado_por` / `atualizado_por` são a autoria. Ficam como uuid solto com FK
-- para auth.users e ON DELETE SET NULL: apagar a conta de alguém não pode
-- apagar o card que essa pessoa criou, nem bloquear o delete da conta.
--
-- O HISTÓRICO de cada card não mora aqui: mora em `adm_audit`, onde já mora o
-- resto. O que muda é que as ações de feature passam a gravar o ID do card em
-- `detalhe->>'feature_id'`, para a ficha do card conseguir perguntar "o que
-- aconteceu NESTE card" — antes o alvo era o título, que muda, e por isso não
-- servia de chave. O índice abaixo é o que faz essa pergunta ser barata.
-- ============================================================================

alter table admin_rf98.adm_features
  add column if not exists descricao      text,
  add column if not exists criado_por     uuid references auth.users(id) on delete set null,
  add column if not exists atualizado_em  timestamptz not null default now(),
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null;

comment on column admin_rf98.adm_features.descricao is
  'Corpo do card: texto livre com links. A `nota` é a linha curta do card fechado.';
comment on column admin_rf98.adm_features.criado_por is
  'Quem criou o card. Null nos cards anteriores a 03/09/2026 e em contas apagadas.';

-- "o que aconteceu neste card" — sem o índice, cada abertura de ficha varre
-- adm_audit inteira
create index if not exists adm_audit_feature_id_idx
  on admin_rf98.adm_audit ((detalhe ->> 'feature_id'))
  where detalhe ? 'feature_id';
