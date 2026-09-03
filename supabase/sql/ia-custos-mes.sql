-- ============================================================================
-- admin_rf98.ia_custos_mes() — o gasto de IA somado NO BANCO, por mês e tipo.
-- ----------------------------------------------------------------------------
-- POR QUE ISTO EXISTE. A página Finanças lia `elifoot_v3.ia_custos` inteira e
-- somava no browser:
--
--     jogo('ia_custos').select('tipo,custo_usd,criado_em')
--
-- `select()` sem `range()` devolve no máximo 1000 linhas — sem erro, sem aviso
-- no corpo, só um `content-range` que ninguém lê. Em 02/09/2026 a tabela tinha
-- 4881 linhas: o painel somava um quinto do gasto e mostrava — e LANÇAVA como
-- despesa — um número que não era o dele. É a mesma armadilha já documentada em
-- `todasAsLinhas()` no admin.js, desta vez nas finanças.
--
-- Paginar resolveria a correção mas não o tamanho: são ~400 gerações por dia,
-- ou seja ~12 mil linhas por mês e uma dúzia de idas ao servidor a cada abertura
-- da página, a crescer para sempre. O que a página precisa é do TOTAL, e total
-- é trabalho de banco: aqui volta uma linha por mês/tipo, e o browser deixa de
-- ver linha de geração.
--
-- `security definer` pelo mesmo motivo das outras funções do painel: o schema do
-- jogo não é lido diretamente pelo papel do painel. A trava é `is_admin()` —
-- gasto do projeto é dado de sócio, e quem não entra no painel não soma nada.
--
-- `fonte` separa o custo MEDIDO do ESTIMADO. A edge function usa o `usage` que a
-- OpenAI devolve quando ele vem ('tokens'); quando não vem, cai numa tabela de
-- preço por imagem ('tabela') que só cobre a imagem de SAÍDA e ignora o prompt e
-- a imagem de entrada — por isso ela é um PISO, e subestima entre 3% e 10%
-- conforme o tipo. Sem esta coluna não havia como ver quanto do total é medido e
-- quanto é chute, que é exatamente a dúvida que abriu esta conciliação.
--
-- O mês é em UTC, de propósito: é o corte que a fatura da OpenAI usa (o export
-- de uso vem com `start_time_iso` em UTC), e conciliar os dois com fusos
-- diferentes daria diferença todo mês na virada do dia.
-- ============================================================================

create or replace function admin_rf98.ia_custos_mes()
returns table (mes text, tipo text, fonte text, n bigint, usd numeric)
language plpgsql
security definer
set search_path = admin_rf98, elifoot_v3, public
as $$
begin
  if not admin_rf98.is_admin() then
    raise exception 'Só administradores do painel veem o gasto de IA' using errcode = '42501';
  end if;
  return query
    select to_char(c.criado_em at time zone 'UTC', 'YYYY-MM')::text,
           c.tipo::text,
           coalesce(c.custo_fonte, 'tabela')::text,
           count(*)::bigint,
           round(sum(c.custo_usd)::numeric, 6)
      from elifoot_v3.ia_custos c
     group by 1, 2, 3
     order by 1, 2, 3;
end $$;

revoke all on function admin_rf98.ia_custos_mes() from public, anon;
grant execute on function admin_rf98.ia_custos_mes() to authenticated;

-- a consulta é sempre "agrupa o mês inteiro": sem índice ela varre a tabela toda
create index if not exists ia_custos_criado_em_idx on elifoot_v3.ia_custos (criado_em);
