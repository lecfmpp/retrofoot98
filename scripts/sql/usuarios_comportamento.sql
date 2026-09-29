-- COMPORTAMENTO NA LISTA DE USUÁRIOS (25/09/2026)
-- admin_rf98.usuarios passa a devolver, por conta:
--   minutos_7       minutos jogados nos últimos 7 dias (tique do rf_heartbeat, aba visível no jogo)
--   dias_ativos_7   dias com login/jogada nos últimos 7 dias  (mesma regra do "Ativos (7 dias)":
--   dias_ativos_30  idem, 30 dias                              interacoes > 0; antes de 26/09, minutos > 0)
--   ultima_jogada   último clique em Jogar/Pronto/Avançar dia ou login (elifoot_v3.user_interacao)
--   ultimo_login    auth.users.last_sign_in_at (só login de verdade; sessão restaurada não conta)
-- Patch por substituição exata, como os anteriores: falha se o trecho não estiver lá.
do $$
declare d text; n text;
  ativo constant text := '(interacoes > 0 or (dia < date ''2026-09-26'' and minutos > 0))';
begin
  d := pg_get_functiondef('admin_rf98.usuarios'::regproc);
  if position('dias_ativos_7' in d) > 0 then return; end if;       -- já aplicado
  n := replace(d,
    'tempo as (select user_id, sum(minutos) minutos from elifoot_v3.user_activity group by user_id)',
    'tempo as (select user_id, sum(minutos) minutos,' ||
    ' sum(minutos) filter (where dia >= current_date - 6) minutos7,' ||
    ' count(distinct dia) filter (where dia >= current_date - 6 and ' || ativo || ') dias7,' ||
    ' count(distinct dia) filter (where dia >= current_date - 29 and ' || ativo || ') dias30' ||
    ' from elifoot_v3.user_activity group by user_id)');
  if n = d then raise exception 'usuarios: CTE tempo não encontrada'; end if;
  d := n;
  n := replace(d, '''minutos'', coalesce(t.minutos,0),',
    '''minutos'', coalesce(t.minutos,0), ''minutos_7'', coalesce(t.minutos7,0),' ||
    ' ''dias_ativos_7'', coalesce(t.dias7,0), ''dias_ativos_30'', coalesce(t.dias30,0),' ||
    ' ''ultima_jogada'', ui.ultima, ''ultimo_login'', b.last_sign_in_at,');
  if n = d then raise exception 'usuarios: campo minutos não encontrado'; end if;
  execute n;
end $$;

-- ===== 27/09/2026: 'plano_desde' (user_plans.since) em admin_rf98.usuarios =====
-- Alimenta o card "Conversão (Peladeiro → Pro)" da página de Usuários: quem virou Pro no período.
-- Patch por replace, aplicado na migração usuarios_plano_desde:
--   'plano', pl.plan, 'plano_ate', up.until,  →  … 'plano_ate', up.until, 'plano_desde', up.since,

-- ===== 27/09/2026: 'socio' em admin_rf98.usuarios =====
-- true quando a conta é de sócio (adm_users papel 'socio'). A página de Usuários tira essas contas
-- de TODOS os números do topo e da contagem por canal (assinaturas e pagamentos de teste inflavam
-- a conversão); na tabela elas continuam, com a etiqueta "sócio". Patch aplicado na migração
-- usuarios_flag_socio: antes de 'plano', pl.plan, entra
--   'socio', exists (select 1 from admin_rf98.adm_users sa where sa.user_id = b.id and sa.papel = 'socio'),

-- ===== 27/09/2026: 'time_coracao' em admin_rf98.usuarios =====
-- O cadastro pergunta o time do coração (public/src/ui/rf-time-coracao.js) e grava em
-- raw_user_meta_data: time_coracao (id do clube | 'outro' | 'nenhum'), time_coracao_nome, time_coracao_serie.
-- O painel recebe {id, nome, serie} (null para quem se cadastrou antes). Patch na migração
-- usuarios_time_coracao, logo depois de 'socio'.

-- ===== 29/09/2026: 'idade' em admin_rf98.usuarios =====
-- O cadastro pergunta a idade (public/src/ui/rf-idade.js) e grava raw_user_meta_data->>'idade'.
-- Patch na migração usuarios_idade: coluna 'idade' no CTE base e 'idade', b.idade no jsonb (null para contas antigas).
-- ===== 29/09/2026: 'chegou_2a' em admin_rf98.analytics (funil) =====
-- Migração analytics_funil_chegou_2a_trava: quem já tinha a temporada por depoimento e teve um
-- paywall_eventos 'exibido' DEPOIS dela (sem sócios). O 'post' continua sendo a etapa seguinte.
