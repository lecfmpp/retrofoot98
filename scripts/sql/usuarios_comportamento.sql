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
