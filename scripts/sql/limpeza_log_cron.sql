-- LIMPEZA DO LOG DO PG_CRON (25/09/2026)
-- cron.job_run_details guarda uma linha por execução de cada job e nunca era limpo: 1,1 milhão de
-- linhas (294 MB) desde 07/2026, +732 por hora (o elifoot-tick-rooms roda a cada 5 s). É só o
-- histórico de execução do agendador — NENHUM dado de jogador, save, sala ou conta. Nada no
-- projeto o lê (conferido no repo e em pg_proc).
--
-- SEGURANÇA:
--   · a função vive no schema `manutencao`, que NÃO está exposto na API (PostgREST): nenhum
--     cliente do site consegue chamá-la; execute revogado de public/anon/authenticated;
--   · ela só apaga de cron.job_run_details, e só linhas com mais de `dias` dias;
--   · apaga em lotes (padrão 50 mil) para não estourar a cota de IO de disco do Supabase.
create schema if not exists manutencao;
revoke all on schema manutencao from public;

create or replace function manutencao.limpar_log_cron(dias int default 7, lote int default 50000)
returns int language plpgsql as $$
declare n int;
begin
  if dias < 1 then raise exception 'dias tem de ser >= 1'; end if;
  delete from cron.job_run_details
   where runid in (select runid from cron.job_run_details
                    where start_time < now() - make_interval(days => dias)
                    order by runid limit lote);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function manutencao.limpar_log_cron(int, int) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname='anon') then
    execute 'revoke all on function manutencao.limpar_log_cron(int, int) from anon, authenticated';
  end if;
end $$;

-- todo dia às 04:30 UTC (01:30 em Brasília, pouca gente a jogar). ~17,5 mil linhas novas por
-- dia: um lote de 50 mil sobra.
select cron.unschedule(jobid) from cron.job where jobname = 'manutencao-limpar-log-cron';
select cron.schedule('manutencao-limpar-log-cron', '30 4 * * *',
                     'select manutencao.limpar_log_cron(7, 50000)');
